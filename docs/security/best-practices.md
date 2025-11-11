# Security Best Practices

**Deploy AxonFlow securely and maintain compliance** - Production-ready security guide.

---

## Overview

This guide covers security best practices for deploying and operating AxonFlow in production environments. Follow these guidelines to maintain security compliance (HIPAA, GDPR, SOC 2) and protect sensitive data.

### Security Principles

1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimum permissions required for operations
3. **Zero Trust** - Never trust, always verify
4. **Audit Everything** - Complete audit trail for compliance
5. **Encrypt Everything** - Data encryption at rest and in transit

---

## Table of Contents

1. [Network Security](#1-network-security)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Protection](#3-data-protection)
4. [Policy Security](#4-policy-security)
5. [Compliance](#5-compliance)
6. [Monitoring & Incident Response](#6-monitoring--incident-response)
7. [Production Checklist](#7-production-checklist)

---

## 1. Network Security

### 1.1 VPC Configuration

**✅ Best Practices:**

```yaml
VPC Architecture:
  - Public Subnets (2): Application Load Balancer only
  - Private Subnets (2): ECS Fargate tasks, RDS database
  - Availability Zones: Minimum 2 (Multi-AZ deployment)
  - CIDR Block: /16 or larger (e.g., 10.0.0.0/16)
```

**Network Topology:**
```
Internet
    ↓
Internet Gateway
    ↓
Public Subnet (ALB)
    ↓
Private Subnet (ECS Tasks)
    ↓
Private Subnet (RDS Database)
```

**🔒 Security Controls:**
- ✅ Deploy ECS tasks in private subnets (no public IPs)
- ✅ Use ALB in public subnet for HTTPS termination
- ✅ RDS database in private subnet (no internet access)
- ✅ NAT Gateway for outbound internet (optional)
- ❌ Never expose Agent/Orchestrator directly to internet

---

### 1.2 Security Groups

Configure least-privilege security group rules.

**ALB Security Group:**
```yaml
Inbound:
  - Port 443 (HTTPS): 0.0.0.0/0  # Public HTTPS access
  - Port 80 (HTTP): 0.0.0.0/0    # Optional (redirect to HTTPS)

Outbound:
  - Port 8443: ECS Task Security Group  # To Agent tasks
  - Port 9443: ECS Task Security Group  # To Orchestrator tasks
```

**ECS Task Security Group:**
```yaml
Inbound:
  - Port 8443: ALB Security Group  # From ALB (Agent)
  - Port 9443: ALB Security Group  # From ALB (Orchestrator)
  - Port 8443: ECS Task Security Group  # Agent-to-Agent
  - Port 9443: ECS Task Security Group  # Orchestrator-to-Orchestrator

Outbound:
  - Port 5432: RDS Security Group  # To PostgreSQL
  - Port 443: 0.0.0.0/0            # To AWS services (Bedrock, Secrets Manager)
  - Port 8443: ECS Task Security Group  # Agent-to-Agent
  - Port 9443: ECS Task Security Group  # Orchestrator-to-Orchestrator
```

**RDS Security Group:**
```yaml
Inbound:
  - Port 5432: ECS Task Security Group  # From ECS tasks only

Outbound:
  - None (database doesn't need outbound)
```

**⚠️ Common Mistakes:**
- ❌ Opening RDS port to 0.0.0.0/0
- ❌ Allowing SSH (port 22) in security groups
- ❌ Using default security groups

---

### 1.3 TLS/SSL Configuration

**Certificate Management:**

```bash
# Use AWS Certificate Manager (ACM) for free TLS certificates
aws acm request-certificate \
  --domain-name axonflow.example.com \
  --validation-method DNS \
  --region us-east-1

# Configure ALB with HTTPS listener
# Minimum TLS version: TLS 1.2
# Recommended: TLS 1.3
```

**ALB HTTPS Configuration:**
```yaml
Listener:
  Protocol: HTTPS
  Port: 443
  Certificate: arn:aws:acm:region:account:certificate/xxx
  SSL Policy: ELBSecurityPolicy-TLS13-1-2-2021-06  # TLS 1.3 + TLS 1.2

  # Redirect HTTP to HTTPS
  HTTP Listener:
    Protocol: HTTP
    Port: 80
    Default Action: Redirect to HTTPS
```

**Internal TLS (Agent ↔ Orchestrator):**
```yaml
# Self-signed certificates for internal communication
# AxonFlow handles this automatically

Agent:
  Port: 8443
  Protocol: HTTPS (HTTP/2 + TLS 1.3)
  Certificate: Self-signed (auto-generated)

Orchestrator:
  Port: 9443
  Protocol: HTTPS (HTTP/2 + TLS 1.3)
  Certificate: Self-signed (auto-generated)
```

**🔒 TLS Best Practices:**
- ✅ Use TLS 1.3 (or minimum TLS 1.2)
- ✅ HTTP/2 for better performance
- ✅ Perfect Forward Secrecy (PFS)
- ✅ Strong cipher suites only
- ❌ Never use TLS 1.0 or 1.1 (deprecated)

---

### 1.4 Internal vs External Endpoints

**Load Balancer Scheme:**

```yaml
# Internal ALB (Recommended for most deployments)
LoadBalancerScheme: internal
  - Accessible only from VPC
  - Best for same-VPC client applications
  - Lowest latency (no internet hop)
  - Most secure (not exposed to internet)

# Internet-facing ALB (Use for external clients)
LoadBalancerScheme: internet-facing
  - Accessible from internet
  - Required for multi-VPC or external integrations
  - Higher latency (internet routing)
  - Must implement additional security controls
```

**When to use internal vs internet-facing:**

| Use Case | Load Balancer Scheme | Security Level |
|----------|---------------------|----------------|
| Applications in same VPC | internal | High |
| Applications in peered VPCs | internal | High |
| Mobile/web apps (public internet) | internet-facing | Medium |
| Partner integrations | internet-facing | Medium |
| Multi-region deployments | internet-facing | Medium |

**🔒 Internet-Facing Security:**

If you must use internet-facing ALB:
1. ✅ Enable AWS WAF (Web Application Firewall)
2. ✅ Implement IP allow lists (if possible)
3. ✅ Enable CloudFront (optional, for DDoS protection)
4. ✅ Use license key authentication
5. ✅ Monitor for suspicious activity
6. ✅ Enable AWS Shield Standard (automatic)

---

## 2. Authentication & Authorization

### 2.1 License Key Management

**License Key Format:**
```
V1: AXON-TIER-ORG-EXPIRY-SIGNATURE
V2: AXON-V2-BASE64-SIGNATURE

Example:
AXON-V2-eyJ0aWVyIjoiUExVUyIsInRlbmFudF9pZCI6Im15LW9yZyJ9-abc123
```

**🔒 Best Practices:**

1. **Store in AWS Secrets Manager:**
```bash
# Create secret
aws secretsmanager create-secret \
  --name axonflow/license-key \
  --description "AxonFlow license key" \
  --secret-string "AXON-V2-xxx-yyy" \
  --region us-east-1

# Retrieve in application
export AXONFLOW_LICENSE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id axonflow/license-key \
  --query SecretString \
  --output text)
```

2. **Environment Variables:**
```bash
# ✅ Good: Load from Secrets Manager
AXONFLOW_LICENSE_KEY=$(aws secretsmanager get-secret-value ...)

# ❌ Bad: Hardcoded in code
const licenseKey = "AXON-V2-abc-123";  // Never do this!

# ❌ Bad: Committed to git
AXONFLOW_LICENSE_KEY=AXON-V2-abc-123  // In .env file
```

3. **Rotation Policy:**
```yaml
License Key Rotation:
  Frequency: Every 90 days (recommended)
  Process:
    1. Generate new license key
    2. Update Secrets Manager
    3. Restart applications (rolling restart)
    4. Revoke old license key after 24 hours

  Emergency Rotation:
    - If key is compromised
    - Immediate rotation required
    - Revoke old key immediately
```

**⚠️ License Key Security:**
- ✅ Never hardcode in source code
- ✅ Never commit to git
- ✅ Store in Secrets Manager or Parameter Store
- ✅ Rotate every 90 days
- ✅ Revoke if compromised
- ❌ Never share between environments (dev/staging/prod)
- ❌ Never log license keys
- ❌ Never include in error messages

---

### 2.2 Service Identity & Permissions

**Service-Based Authentication (Recommended):**

```typescript
// Service identity with specific permissions
const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT,
  licenseKey: process.env.SERVICE_LICENSE_KEY,  // Service-specific key
  organizationId: 'my-org',
  serviceIdentity: {
    name: 'trip-planner',
    type: 'backend-service',
    permissions: [
      'mcp:amadeus:search_flights',
      'mcp:amadeus:search_hotels',
      'mcp:amadeus:lookup_airport'
    ]
  }
});
```

**Permission Model:**

```yaml
User Permissions:
  - Query execution (basic)
  - Policy evaluation (basic)
  - NO direct MCP access (security)

Service Permissions:
  - Query execution
  - Policy evaluation
  - MCP connector access (specific operations only)
  - Example: mcp:amadeus:search_flights, mcp:snowflake:query

Admin Permissions:
  - All user/service permissions
  - License key management
  - MCP connector configuration
  - Audit log access
```

**🔒 Least Privilege:**
- ✅ Services have specific permissions only
- ✅ Users have minimal permissions
- ✅ Admins use separate credentials
- ❌ Never grant wildcard permissions (`mcp:*:*`)
- ❌ Never share service credentials

---

### 2.3 MCP Connector Credentials

**Credential Storage:**

```bash
# Store all MCP credentials in Secrets Manager
aws secretsmanager create-secret \
  --name axonflow/mcp/salesforce \
  --secret-string '{
    "client_id": "xxx",
    "client_secret": "yyy",
    "instance_url": "https://company.salesforce.com"
  }'

aws secretsmanager create-secret \
  --name axonflow/mcp/snowflake \
  --secret-string '{
    "account": "xxx",
    "username": "yyy",
    "password": "zzz",
    "warehouse": "COMPUTE_WH",
    "database": "ANALYTICS"
  }'
```

**Credential Rotation:**

```yaml
Rotation Schedule:
  Salesforce: Every 90 days
  Snowflake: Every 90 days
  Slack: Every 180 days (bot tokens)
  Amadeus: Every 365 days (API keys)

Rotation Process:
  1. Generate new credentials in source system
  2. Update Secrets Manager
  3. Test connectivity
  4. Restart AxonFlow agents (rolling restart)
  5. Monitor for errors
  6. Revoke old credentials after 24 hours
```

**🔒 MCP Security:**
- ✅ One secret per connector
- ✅ Rotate every 90 days
- ✅ Use read-only credentials where possible
- ✅ Implement permission checks in policies
- ❌ Never store credentials in code
- ❌ Never use admin-level credentials

---

## 3. Data Protection

### 3.1 Data Encryption

**Encryption at Rest:**

```yaml
RDS Database:
  Encryption: AES-256
  Key Management: AWS KMS
  KMS Key: Customer-managed (recommended)
  Backup Encryption: Enabled (automatic)

ECS Task Volumes:
  Encryption: AES-256 (Fargate default)
  Ephemeral Storage: Encrypted automatically

CloudWatch Logs:
  Encryption: AES-256
  KMS Key: Customer-managed (optional)
```

**Encryption in Transit:**

```yaml
Client → ALB:
  Protocol: HTTPS (TLS 1.3)
  Certificate: ACM-managed
  Cipher Suites: Strong only

ALB → Agent:
  Protocol: HTTPS (TLS 1.3)
  Certificate: Self-signed
  HTTP/2: Enabled

Agent → RDS:
  Protocol: PostgreSQL SSL
  Certificate: RDS-provided
  Verify CA: Enabled

Agent → AWS Services:
  Protocol: HTTPS (TLS 1.3)
  Certificate: AWS-managed
  Example: Bedrock, Secrets Manager, KMS
```

**🔒 Encryption Best Practices:**
- ✅ Encrypt all data at rest (database, backups, logs)
- ✅ Use TLS 1.3 for all network traffic
- ✅ Customer-managed KMS keys (for compliance)
- ✅ Rotate KMS keys annually
- ❌ Never disable encryption
- ❌ Never use self-signed certs for external endpoints

---

### 3.2 PII Detection & Redaction

**Automated PII Protection:**

```rego
# Policy: Detect and redact PII
package axonflow.policy

import future.keywords

# PII patterns
ssn_pattern := `\b\d{3}-\d{2}-\d{4}\b`
credit_card_pattern := `\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b`
email_pattern := `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`
phone_pattern := `\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`

# Detect PII in query
pii_detected {
    regex.match(ssn_pattern, input.query)
}

pii_detected {
    regex.match(credit_card_pattern, input.query)
}

# Auto-redact PII
redacted_query := query {
    query := regex.replace(input.query, ssn_pattern, "***-**-****")
    query := regex.replace(query, credit_card_pattern, "****-****-****-****")
    query := regex.replace(query, email_pattern, "***@***.***")
    query := regex.replace(query, phone_pattern, "***-***-****")
}

# Allow if PII is redacted
default allow = false

allow {
    redacted_query != input.query
    count(pii_violations) == 0
}

allow {
    redacted_query == input.query
}

# Log PII detection
log_pii_detection {
    pii_detected
    metadata := {
        "severity": "HIGH",
        "action": "PII_REDACTED",
        "user_id": input.context.user_id,
        "timestamp": time.now_ns()
    }
}
```

**🔒 PII Protection:**
- ✅ Auto-detect PII in queries
- ✅ Auto-redact before processing
- ✅ Log all PII detection events
- ✅ Block queries with too much PII
- ✅ Implement data masking in responses
- ❌ Never log PII in plain text
- ❌ Never store PII in audit logs

---

### 3.3 Data Retention & Deletion

**Retention Policies:**

```yaml
Audit Logs (CloudWatch):
  Retention: 90 days (minimum for compliance)
  Recommended: 365 days (1 year)
  Compliance:
    - HIPAA: 6 years
    - GDPR: Varies by use case
    - SOC 2: 1 year minimum

Database Backups:
  Retention: 7 days (automatic)
  Recommended: 30 days
  Point-in-Time Recovery: 35 days

User Data:
  Active Users: Indefinite
  Inactive Users: 90 days after last activity
  Deleted Users: 30 days (soft delete), then permanent

Query Results:
  Cache TTL: 5 minutes (in-memory)
  No persistent storage (by design)
```

**Data Deletion Workflow:**

```typescript
// GDPR Right to be Forgotten
async function deleteUserData(userId: string) {
  // 1. Soft delete user account
  await db.users.update(userId, {
    deleted_at: new Date(),
    status: 'DELETED',
    gdpr_deletion_requested: true
  });

  // 2. Anonymize audit logs
  await db.audit_logs.update(
    { user_id: userId },
    { user_id: 'DELETED_USER', pii_redacted: true }
  );

  // 3. Schedule permanent deletion (30 days)
  await scheduleJob({
    type: 'PERMANENT_DELETE_USER',
    userId: userId,
    executeAt: addDays(new Date(), 30)
  });

  // 4. Log deletion request
  await audit.log({
    event: 'USER_DELETION_REQUESTED',
    user_id: userId,
    timestamp: new Date(),
    compliance_type: 'GDPR'
  });
}
```

---

## 4. Policy Security

### 4.1 Policy Validation

**Pre-Deployment Validation:**

```bash
# Validate policy syntax with OPA
opa test policy.rego

# Run policy test suite
opa test policy.rego policy_test.rego

# Check policy coverage
opa test --coverage policy.rego policy_test.rego
```

**Test Suite Example:**

```rego
# policy_test.rego
package axonflow.policy

test_allow_admin {
    allow with input as {
        "context": {"user_role": "admin"},
        "query": "Get all customer data"
    }
}

test_deny_regular_user {
    not allow with input as {
        "context": {"user_role": "user"},
        "query": "Get all customer data"
    }
}

test_pii_redaction {
    query := redacted_query with input.query as "Get data for SSN 123-45-6789"
    query == "Get data for SSN ***-**-****"
}
```

**🔒 Policy Validation:**
- ✅ Test policies before deployment
- ✅ 100% test coverage for critical policies
- ✅ Validate with OPA CLI
- ✅ Run in CI/CD pipeline
- ✅ Peer review all policy changes
- ❌ Never deploy untested policies

---

### 4.2 Policy Version Control

**Git Workflow:**

```bash
policies/
├── production/
│   ├── main.rego           # Main policy
│   ├── rbac.rego           # Role-based access control
│   ├── pii.rego            # PII detection
│   └── connectors/
│       ├── salesforce.rego
│       ├── snowflake.rego
│       └── slack.rego
├── staging/
│   └── (same structure)
└── tests/
    ├── main_test.rego
    ├── rbac_test.rego
    └── pii_test.rego

# Deployment workflow
git add policies/production/main.rego
git commit -m "Add PII redaction to main policy"
git push origin main

# CI/CD pipeline runs:
# 1. opa test (validation)
# 2. Deploy to staging
# 3. Run integration tests
# 4. Deploy to production (manual approval)
```

**Change Management:**

```yaml
Policy Change Process:
  1. Create feature branch
  2. Update policy
  3. Write tests
  4. Submit pull request
  5. Peer review (required)
  6. Automated tests pass
  7. Deploy to staging
  8. Manual testing
  9. Deploy to production
  10. Monitor for 24 hours

Emergency Policy Updates:
  - Security vulnerability: Immediate deployment
  - Compliance violation: Within 1 hour
  - Performance issue: Within 4 hours
  - Feature request: Normal process
```

---

### 4.3 Policy Performance

**Optimize Policy Evaluation:**

```rego
# ❌ Bad: Expensive computation
allow {
    user_permissions := http.send({
        "method": "GET",
        "url": sprintf("https://api/permissions/%s", [input.user_id])
    }).body
    "admin" in user_permissions.roles
}

# ✅ Good: Cache permissions in context
allow {
    input.context.user_permissions.roles[_] == "admin"
}

# ✅ Good: Use indexed lookups
allow {
    input.context.user_role == "admin"
}

# ❌ Bad: O(n²) complexity
allow {
    some i, j
    input.permissions[i] == required_permissions[j]
}

# ✅ Good: O(n) complexity with sets
allow {
    required := {"read", "write", "delete"}
    granted := {p | p := input.permissions[_]}
    required & granted == required
}
```

**Performance Targets:**
- Policy Evaluation: < 5ms P95
- Policy Compilation: < 100ms
- Policy Size: < 100 KB

---

## 5. Compliance

### 5.1 HIPAA Compliance

**Requirements for Healthcare:**

```yaml
PHI Protection:
  - Encryption at rest (AES-256) ✅
  - Encryption in transit (TLS 1.3) ✅
  - Access controls (RBAC) ✅
  - Audit logging (all access) ✅
  - Data retention (6 years) ✅
  - Breach notification (60 days) ✅

Technical Safeguards:
  - Unique user identification ✅
  - Emergency access procedure ✅
  - Automatic log-off (session timeout) ✅
  - Encryption and decryption ✅

Administrative Safeguards:
  - Security management process ✅
  - Assigned security responsibility ✅
  - Workforce training ✅
  - Regular security assessments ✅

Physical Safeguards:
  - AWS data center security ✅
  - Workstation security ✅
  - Device and media controls ✅
```

**HIPAA Policy Example:**

```rego
package axonflow.policy.hipaa

# HIPAA minimum necessary rule
allow {
    input.context.user_role in ["doctor", "nurse"]
    is_patient_assigned_to_user(input.query, input.context.user_id)
}

# Deny broad queries
deny["HIPAA violation: minimum necessary rule"] {
    contains(lower(input.query), "all patients")
    input.context.user_role != "admin"
}

# Audit all PHI access
log_phi_access {
    metadata := {
        "hipaa_compliance": true,
        "phi_accessed": true,
        "user_id": input.context.user_id,
        "patient_id": extract_patient_id(input.query),
        "access_reason": input.context.access_reason,
        "timestamp": time.now_ns()
    }
}
```

---

### 5.2 GDPR Compliance

**GDPR Requirements:**

```yaml
Data Subject Rights:
  - Right to access ✅
  - Right to rectification ✅
  - Right to erasure ("right to be forgotten") ✅
  - Right to restrict processing ✅
  - Right to data portability ✅
  - Right to object ✅

Data Protection:
  - Lawful basis for processing ✅
  - Consent management ✅
  - Data minimization ✅
  - Purpose limitation ✅
  - Storage limitation ✅
  - Integrity and confidentiality ✅

Accountability:
  - Data Protection Impact Assessment (DPIA) ✅
  - Data Protection Officer (DPO) ✅
  - Records of processing activities ✅
  - Breach notification (72 hours) ✅
```

---

### 5.3 SOC 2 Type II

**Control Categories:**

```yaml
Security (CC6):
  - Logical and physical access controls ✅
  - System operations ✅
  - Change management ✅
  - Risk mitigation ✅

Availability (A1):
  - Multi-AZ deployment ✅
  - Auto-scaling ✅
  - Health checks ✅
  - Disaster recovery ✅

Processing Integrity (PI1):
  - Data validation ✅
  - Error handling ✅
  - Quality assurance ✅

Confidentiality (C1):
  - Encryption ✅
  - Access controls ✅
  - Network security ✅

Privacy (P1):
  - Consent management ✅
  - Data retention ✅
  - Data disposal ✅
```

---

## 6. Monitoring & Incident Response

### 6.1 Security Monitoring

**CloudWatch Alarms:**

```yaml
Critical Alarms:
  - Unauthorized access attempts > 10/minute
  - Policy denial rate > 50%
  - Failed authentication > 100/hour
  - Database connection failures
  - High CPU/Memory utilization (> 80%)

Security Events to Monitor:
  - License key validation failures
  - Policy evaluation errors
  - MCP connector authentication failures
  - Unusual query patterns
  - PII detection events
  - Admin actions (policy changes, credential updates)
```

**Log Analysis:**

```bash
# Monitor for suspicious activity
aws logs filter-log-events \
  --log-group-name /ecs/axonflow/agent \
  --filter-pattern '"policy_decision=deny"' \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Monitor failed authentications
aws logs filter-log-events \
  --log-group-name /ecs/axonflow/agent \
  --filter-pattern '"authentication_failed"'

# Monitor PII detection
aws logs filter-log-events \
  --log-group-name /ecs/axonflow/agent \
  --filter-pattern '"pii_detected=true"'
```

---

### 6.2 Incident Response

**Incident Response Playbook:**

```yaml
1. Detection (0-15 minutes):
  - Alarm triggered
  - Log analysis confirms incident
  - Classify severity (P1-P4)

2. Containment (15-30 minutes):
  - Isolate affected systems
  - Block malicious IPs (WAF, Security Groups)
  - Revoke compromised credentials
  - Enable enhanced logging

3. Investigation (30-120 minutes):
  - Review audit logs
  - Identify root cause
  - Determine data exposure
  - Document timeline

4. Remediation (2-8 hours):
  - Patch vulnerabilities
  - Update policies
  - Rotate credentials
  - Deploy fixes

5. Recovery (8-24 hours):
  - Restore normal operations
  - Monitor for residual issues
  - Verify all systems healthy

6. Post-Incident (24-72 hours):
  - Write incident report
  - Update runbooks
  - Conduct blameless post-mortem
  - Implement preventive measures
```

---

## 7. Production Checklist

### Pre-Deployment Security Review

```yaml
✅ Network Security:
  [ ] VPC configured with private subnets
  [ ] Security groups follow least privilege
  [ ] ALB configured with HTTPS (TLS 1.3)
  [ ] Internal endpoints for same-VPC clients
  [ ] WAF enabled (if internet-facing)

✅ Authentication:
  [ ] License keys stored in Secrets Manager
  [ ] Service identity configured
  [ ] MCP credentials in Secrets Manager
  [ ] Credential rotation schedule documented

✅ Data Protection:
  [ ] Encryption at rest enabled (RDS, logs)
  [ ] Encryption in transit (TLS 1.3)
  [ ] PII detection policies implemented
  [ ] Data retention policies configured

✅ Policy Security:
  [ ] All policies tested (100% coverage)
  [ ] Policies version controlled (git)
  [ ] Change management process documented
  [ ] Emergency policy update procedure defined

✅ Compliance:
  [ ] HIPAA requirements met (if applicable)
  [ ] GDPR requirements met (if applicable)
  [ ] SOC 2 controls implemented
  [ ] Data Processing Agreement signed

✅ Monitoring:
  [ ] CloudWatch alarms configured
  [ ] Security event monitoring enabled
  [ ] Incident response playbook documented
  [ ] On-call rotation established

✅ Disaster Recovery:
  [ ] Multi-AZ deployment verified
  [ ] Database backups enabled (30 days)
  [ ] Restore procedure tested
  [ ] RTO/RPO objectives met
```

---

## Additional Resources

- **[Deployment Guide](/docs/deployment/aws-marketplace)** - CloudFormation deployment
- **[Policy Syntax](/docs/policies/syntax)** - Policy language reference
- **[Compliance Guide](/docs/security/compliance)** - Detailed compliance requirements
- **[API Reference](/docs/api/agent-endpoints)** - API security documentation

---

**Security is a shared responsibility** - AWS provides infrastructure security, you're responsible for application security.

For security questions or to report vulnerabilities, contact: security@getaxonflow.com
