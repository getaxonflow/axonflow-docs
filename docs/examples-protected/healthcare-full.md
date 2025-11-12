# Healthcare AI Assistant Example

## Overview

This example demonstrates a HIPAA-compliant healthcare AI assistant built with AxonFlow. It shows how to implement:

- **HIPAA compliance** with audit logging and data protection
- **PII detection and redaction** for patient data
- **Role-based access control (RBAC)** for healthcare staff
- **Multi-source data integration** (EHR, lab systems, medical databases)
- **AI-powered medical insights** with policy enforcement
- **Audit trails** for compliance and security

**Difficulty:** Advanced
**Time to Complete:** 30 minutes
**Industry:** Healthcare
**Compliance:** HIPAA, GDPR

---

## What You'll Build

A production-ready healthcare assistant that:

1. **Answers patient queries** while protecting PHI (Protected Health Information)
2. **Integrates with EHR systems** using MCP connectors
3. **Provides medical insights** using AWS Bedrock with compliance guardrails
4. **Enforces access controls** based on user roles (doctor, nurse, admin)
5. **Logs all access** for HIPAA audit requirements
6. **Redacts sensitive data** automatically

---

## Architecture

```
Patient Query → AxonFlow Agent → Policy Enforcement → EHR/Lab Systems
                       ↓                ↓                    ↓
                  License Check    RBAC Check         MCP Connectors
                       ↓                ↓                    ↓
                  PII Detection    Rate Limiting      Permission-Aware
                       ↓                ↓                    ↓
                  AWS Bedrock      Audit Logging      Data Retrieval
                       ↓                                     ↓
                  AI Response ←────────── Results ←─────────┘
                       ↓
                  PII Redaction → Encrypted Response → User
                       ↓
                  CloudWatch Logs (Audit Trail)
```

---

## Prerequisites

- AxonFlow deployed on AWS
- Agent Endpoint and License Key
- AWS Bedrock access (Claude 3 Sonnet)
- EHR system access credentials (optional for full demo)
- Node.js 18+ or Go 1.21+

---

## Quick Start

### 1. Clone the Example

```bash
git clone https://github.com/axonflow/axonflow.git
cd axonflow/examples/healthcare-assistant
```

### 2. Install Dependencies

**TypeScript:**
```bash
cd typescript
npm install
```

**Go:**
```bash
cd go
go mod download
```

### 3. Configure Environment

Create `.env` file:

```bash
# AxonFlow Configuration
AXONFLOW_ENDPOINT=https://your-agent-endpoint
AXONFLOW_LICENSE_KEY=your-license-key
AXONFLOW_ORG_ID=your-healthcare-org

# AWS Bedrock (for AI insights)
AWS_REGION=us-east-1

# EHR System (optional - uses mock data if not configured)
EHR_CONNECTOR_URL=https://your-ehr-system
EHR_API_KEY=your-ehr-api-key
```

### 4. Run the Example

**TypeScript:**
```bash
npm start
```

**Go:**
```bash
go run main.go
```

---

## Code Examples

### Basic Patient Query with RBAC

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT!,
  licenseKey: process.env.AXONFLOW_LICENSE_KEY!,
  organizationId: process.env.AXONFLOW_ORG_ID!
});

async function queryPatientData(userId: string, userRole: string) {
  const policy = `
    package axonflow.policy

    import future.keywords

    # Allow doctors full access
    allow {
      input.context.user_role == "doctor"
    }

    # Allow nurses limited access
    allow {
      input.context.user_role == "nurse"
      not contains_sensitive_data
    }

    # Block access to highly sensitive data
    contains_sensitive_data {
      sensitive_terms := ["HIV", "psychiatric", "substance abuse"]
      some term in sensitive_terms
      contains(lower(input.query), lower(term))
    }

    # Audit all access
    log_access {
      metadata := {
        "user_id": input.context.user_id,
        "user_role": input.context.user_role,
        "query": input.query,
        "timestamp": input.context.timestamp,
        "allowed": allow
      }
    }
  `;

  try {
    const response = await client.executeQuery({
      query: 'Show me patient John Doe medical history',
      policy: policy,
      context: {
        user_id: userId,
        user_role: userRole,
        timestamp: new Date().toISOString(),
        hipaa_audit: true
      },
      mcp: {
        connector: 'ehr-system',
        operation: 'get_patient_history',
        credentials: {
          api_key: process.env.EHR_API_KEY
        }
      }
    });

    console.log('Patient Data:', response.result);
    console.log('Access Logged:', response.metadata.audit_id);
  } catch (error) {
    console.error('Access Denied:', error.message);
  }
}

// Example: Doctor with full access
await queryPatientData('dr.smith@hospital.com', 'doctor');

// Example: Nurse with limited access
await queryPatientData('nurse.johnson@hospital.com', 'nurse');
```

### AI-Powered Medical Insights with Compliance

```typescript
async function getMedicalInsights(patientId: string, symptoms: string) {
  const policy = `
    package axonflow.policy

    import future.keywords

    # Allow LLM queries for medical insights
    allow {
      input.llm.provider == "aws-bedrock"
      input.context.purpose == "medical_insights"
      not contains_phi  # Ensure no PHI in LLM query
    }

    # Detect PHI in query
    contains_phi {
      phi_patterns := ["SSN", "date of birth", "address", "phone"]
      some pattern in phi_patterns
      contains(lower(input.query), pattern)
    }

    # Rate limiting for LLM (cost control)
    deny["LLM rate limit exceeded"] {
      llm_calls_today := count_llm_calls(input.context.user_id)
      llm_calls_today > 50
    }
  `;

  const response = await client.executeQuery({
    query: `Analyze these symptoms and suggest possible diagnoses: ${symptoms}.
            Provide evidence-based recommendations.`,
    policy: policy,
    llm: {
      provider: 'aws-bedrock',
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      temperature: 0.3,  // Lower temperature for medical accuracy
      max_tokens: 1000
    },
    context: {
      patient_id: patientId,
      purpose: 'medical_insights',
      user_id: 'dr.smith@hospital.com',
      timestamp: new Date().toISOString()
    }
  });

  return response.result;
}

const insights = await getMedicalInsights(
  'patient-12345',
  'fever, headache, fatigue for 3 days'
);

console.log('Medical Insights:', insights);
```

### Multi-Source Data Integration (MAP)

Retrieve patient data from multiple systems in parallel:

```typescript
async function getComprehensivePatientView(patientId: string) {
  const policy = `
    package axonflow.policy

    default allow = true

    # Log all data access for HIPAA
    log_access {
      metadata := {
        "patient_id": input.context.patient_id,
        "accessed_by": input.context.user_id,
        "systems_accessed": input.context.systems,
        "timestamp": input.context.timestamp
      }
    }
  `;

  const responses = await client.executeParallel([
    {
      query: `Get patient demographics for ${patientId}`,
      policy: policy,
      mcp: {
        connector: 'ehr-system',
        operation: 'get_demographics'
      },
      context: {
        patient_id: patientId,
        user_id: 'dr.smith@hospital.com',
        systems: ['ehr'],
        timestamp: new Date().toISOString()
      }
    },
    {
      query: `Get recent lab results for ${patientId}`,
      policy: policy,
      mcp: {
        connector: 'lab-system',
        operation: 'get_lab_results',
        params: {
          patient_id: patientId,
          days: 30
        }
      },
      context: {
        patient_id: patientId,
        user_id: 'dr.smith@hospital.com',
        systems: ['lab'],
        timestamp: new Date().toISOString()
      }
    },
    {
      query: `Get prescription history for ${patientId}`,
      policy: policy,
      mcp: {
        connector: 'pharmacy-system',
        operation: 'get_prescriptions'
      },
      context: {
        patient_id: patientId,
        user_id: 'dr.smith@hospital.com',
        systems: ['pharmacy'],
        timestamp: new Date().toISOString()
      }
    },
    {
      query: `Get appointment history for ${patientId}`,
      policy: policy,
      mcp: {
        connector: 'ehr-system',
        operation: 'get_appointments'
      },
      context: {
        patient_id: patientId,
        user_id: 'dr.smith@hospital.com',
        systems: ['ehr'],
        timestamp: new Date().toISOString()
      }
    }
  ]);

  return {
    demographics: responses[0].result,
    labs: responses[1].result,
    prescriptions: responses[2].result,
    appointments: responses[3].result,
    retrieved_in_ms: Math.max(...responses.map(r => r.metadata.latency_ms))
  };
}

const patientView = await getComprehensivePatientView('patient-12345');
console.log('Complete Patient View:', patientView);
console.log(`Retrieved from 4 systems in ${patientView.retrieved_in_ms}ms`);
```

### PII Detection and Redaction

```typescript
async function queryWithPIIProtection(query: string) {
  const policy = `
    package axonflow.policy

    import future.keywords

    # Allow query
    default allow = true

    # Detect PII in response
    redact_pii {
      pii_patterns := [
        "\\d{3}-\\d{2}-\\d{4}",  # SSN
        "\\d{10}",               # Phone
        "\\d{5}(-\\d{4})?",      # ZIP code
        "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}"  # Email
      ]
    }
  `;

  const response = await client.executeQuery({
    query: query,
    policy: policy,
    context: {
      pii_detection: true,
      redaction_enabled: true
    }
  });

  // AxonFlow automatically redacts PII based on policy
  return response.result;
}

const result = await queryWithPIIProtection(
  'Show patient contact information'
);

// Result will have PII redacted:
// "Patient: John Doe, Phone: [REDACTED], Email: [REDACTED]"
console.log('Redacted Result:', result);
```

---

## HIPAA Compliance Features

### 1. Access Controls

```typescript
const rbacPolicy = `
package axonflow.policy

import future.keywords

# Define role permissions
role_permissions := {
  "doctor": ["read", "write", "prescribe"],
  "nurse": ["read", "update_vitals"],
  "receptionist": ["read_basic"],
  "admin": ["read", "write", "admin"]
}

# Check if user has permission
allow {
  user_role := input.context.user_role
  required_permission := input.context.required_permission
  user_role in role_permissions
  required_permission in role_permissions[user_role]
}
`;
```

### 2. Audit Logging

All queries are automatically logged to CloudWatch with:

- User ID and role
- Patient ID accessed
- Timestamp
- Query content
- Access granted/denied
- Data sources accessed
- IP address

**Example CloudWatch Log Entry:**

```json
{
  "event": "patient_data_access",
  "user_id": "dr.smith@hospital.com",
  "user_role": "doctor",
  "patient_id": "patient-12345",
  "query": "Get patient medical history",
  "access_granted": true,
  "systems_accessed": ["ehr-system", "lab-system"],
  "timestamp": "2025-11-11T10:30:00Z",
  "ip_address": "10.0.1.45",
  "session_id": "sess-abc123"
}
```

### 3. Data Encryption

- **In-transit:** TLS 1.3 for all communications
- **At-rest:** AES-256 encryption for stored data
- **Key management:** AWS KMS for encryption keys

### 4. Data Retention

```typescript
const retentionPolicy = `
package axonflow.policy

import future.keywords

# Enforce data retention limits
deny["Data retention period exceeded"] {
  record_date := time.parse_rfc3339_ns(input.data.created_at)
  now := time.now_ns()
  age_days := (now - record_date) / (24 * 60 * 60 * 1000000000)

  # HIPAA requires 6 years minimum
  age_days > (6 * 365)
}
`;
```

---

## Production Deployment

### Security Checklist

- [ ] Deploy in private VPC (no public internet access)
- [ ] Enable CloudWatch logging for all queries
- [ ] Configure AWS KMS for encryption
- [ ] Set up AWS WAF for DDoS protection
- [ ] Enable VPC Flow Logs
- [ ] Configure security groups (least privilege)
- [ ] Set up CloudWatch alarms for suspicious activity
- [ ] Enable AWS Config for compliance monitoring
- [ ] Configure backup and disaster recovery
- [ ] Test incident response procedures

### HIPAA Compliance Checklist

- [ ] Business Associate Agreement (BAA) with AWS
- [ ] Risk assessment completed
- [ ] Security policies documented
- [ ] Staff training completed
- [ ] Access controls implemented and tested
- [ ] Audit logging enabled
- [ ] Encryption at-rest and in-transit
- [ ] Backup and disaster recovery tested
- [ ] Incident response plan documented
- [ ] Regular security assessments scheduled

---

## Performance Optimization

### Caching for Frequently Accessed Data

```typescript
const cache = new Map<string, { data: any, expires: number }>();

async function getCachedPatientData(patientId: string) {
  const cacheKey = `patient:${patientId}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await client.executeQuery({
    query: `Get patient demographics for ${patientId}`,
    policy: basicPolicy,
    mcp: { connector: 'ehr-system', operation: 'get_demographics' }
  });

  cache.set(cacheKey, {
    data: data.result,
    expires: Date.now() + 5 * 60 * 1000  // 5 minute cache
  });

  return data.result;
}
```

### Connection Pooling

```typescript
const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT!,
  licenseKey: process.env.AXONFLOW_LICENSE_KEY!,
  organizationId: process.env.AXONFLOW_ORG_ID!,
  pool: {
    maxConnections: 20,
    minConnections: 5,
    idleTimeout: 30000
  }
});
```

---

## Monitoring and Alerts

### CloudWatch Metrics

Monitor these key metrics:

- **Query latency:** Average and P99
- **Query success rate:** Percentage of successful queries
- **Access denied count:** Number of policy violations
- **PII detection count:** Number of PII instances found
- **LLM cost:** Daily spending on AI queries
- **Error rate:** Failed queries by error type

### Example CloudWatch Alarm

```yaml
AlarmName: HighAccessDeniedRate
MetricName: PolicyDeniedCount
Namespace: AxonFlow/Healthcare
Statistic: Sum
Period: 300
EvaluationPeriods: 2
Threshold: 10
ComparisonOperator: GreaterThanThreshold
AlarmActions:
  - !Ref SecurityTeamSNSTopic
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Healthcare Assistant', () => {
  it('should allow doctor to access patient data', async () => {
    const response = await queryPatientData('dr.smith@hospital.com', 'doctor');
    expect(response.metadata.policy_decision).toBe('allow');
  });

  it('should deny nurse access to sensitive data', async () => {
    await expect(
      queryPatientData('nurse.johnson@hospital.com', 'nurse', 'HIV status')
    ).rejects.toThrow('Access denied');
  });

  it('should redact PII in responses', async () => {
    const response = await queryWithPIIProtection('Show patient SSN');
    expect(response).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    expect(response).toContain('[REDACTED]');
  });
});
```

### Integration Tests

```typescript
describe('EHR Integration', () => {
  it('should retrieve patient data from EHR system', async () => {
    const response = await client.executeQuery({
      query: 'Get patient demographics for test-patient-123',
      policy: testPolicy,
      mcp: {
        connector: 'ehr-system',
        operation: 'get_demographics'
      }
    });

    expect(response.result).toHaveProperty('patient_id');
    expect(response.result).toHaveProperty('name');
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue:** Access denied for valid user

**Solution:** Check role mapping in policy. Ensure `user_role` in context matches policy expectations.

```typescript
// Incorrect
context: { role: 'doctor' }  // Wrong key

// Correct
context: { user_role: 'doctor' }
```

**Issue:** PII not being redacted

**Solution:** Enable PII detection in context:

```typescript
context: {
  pii_detection: true,
  redaction_enabled: true
}
```

**Issue:** Slow queries to EHR system

**Solution:** Implement caching and use MAP for parallel queries:

```typescript
// Instead of sequential:
const demo = await getDemo(patientId);
const labs = await getLabs(patientId);

// Use parallel:
const [demo, labs] = await client.executeParallel([
  { query: 'Get demographics', mcp: { connector: 'ehr' } },
  { query: 'Get labs', mcp: { connector: 'lab' } }
]);
```

---

## Next Steps

1. **Add more MCP connectors:**
   - Imaging systems (PACS)
   - Billing systems
   - Insurance verification

2. **Implement advanced features:**
   - Drug interaction checking
   - Clinical decision support
   - Predictive analytics

3. **Deploy to production:**
   - Follow HIPAA compliance checklist
   - Set up monitoring and alerts
   - Train staff on usage

4. **Extend to mobile:**
   - Build mobile app with AxonFlow SDK
   - Implement offline mode
   - Add biometric authentication

---

## Resources

- [AxonFlow Documentation](https://docs.getaxonflow.com)
- [HIPAA Compliance Guide](https://docs.getaxonflow.com/security/hipaa)
- [MCP Connector Reference](https://docs.getaxonflow.com/mcp/connectors)
- [Policy Language (Rego)](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [AWS HIPAA Compliance](https://aws.amazon.com/compliance/hipaa-compliance/)

---

## Support

For questions or issues:

- Email: support@getaxonflow.com
- Documentation: https://docs.getaxonflow.com
- GitHub Issues: https://github.com/axonflow/axonflow/issues

---

**This example demonstrates production-ready HIPAA-compliant healthcare application patterns with AxonFlow.**
