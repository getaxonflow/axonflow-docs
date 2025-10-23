# Post-Deployment Configuration

After successfully deploying AxonFlow via CloudFormation, complete these configuration steps to get your system production-ready.

## 1. Verify Health Status

Test the Agent health endpoint to confirm all components are operational.

```bash
AGENT_ENDPOINT="https://YOUR_AGENT_ENDPOINT"
curl -k ${AGENT_ENDPOINT}/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "database": "connected",
    "orchestrator": "reachable"
  },
  "timestamp": "2025-10-23T10:30:45Z"
}
```

### Troubleshooting Health Check

**If "database": "disconnected":**
- Verify RDS security group allows inbound 5432 from Agent security group
- Check database endpoint in environment variables
- Test database connectivity: `psql -h DB_ENDPOINT -U axonflow -d axonflow`

**If "orchestrator": "unreachable":**
- Verify Orchestrator service is running: `aws ecs describe-services ...`
- Check security group allows Agent → Orchestrator (port 8081)
- Review Orchestrator logs in CloudWatch

## 2. Configure MCP Connectors

AxonFlow uses Model Context Protocol (MCP) v0.2 for permission-aware data access.

### Available Connectors

- **Amadeus GDS**: Travel booking integration
- **Redis**: Cache and session management
- **PostgreSQL**: Database access
- **HTTP REST**: Generic API integration

### Creating a Connector

**Example: Configure Redis Connector**

```bash
curl -X POST ${AGENT_ENDPOINT}/api/v1/connectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "production-redis",
    "type": "redis",
    "config": {
      "host": "redis.internal.company.com",
      "port": 6379,
      "db": 0,
      "password": "stored-in-secrets-manager",
      "tls": true
    },
    "permissions": {
      "read": ["cache:*", "session:*"],
      "write": ["cache:*"]
    }
  }'
```

**Response:**
```json
{
  "id": "conn_abc123",
  "name": "production-redis",
  "type": "redis",
  "status": "active",
  "created_at": "2025-10-23T10:35:12Z"
}
```

### Test Connector

```bash
curl -X GET ${AGENT_ENDPOINT}/api/v1/connectors/conn_abc123/test \
  -H "Authorization: Bearer YOUR_API_KEY"
```

For detailed connector configuration, see [MCP Connectors](/docs/mcp/overview).

## 3. Set Up Policy-as-Code

AxonFlow uses declarative policies for governance.

### Create Policy Repository

```bash
mkdir axonflow-policies
cd axonflow-policies
git init

# Create directory structure
mkdir -p policies/{access-control,rate-limiting,data-permissions}
```

### Example: Rate Limiting Policy

**File: `policies/rate-limiting/per-user.yaml`**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: rate-limit-per-user
  description: Limit each user to 100 requests per minute
spec:
  type: rate-limit
  priority: 100
  rules:
    - limit: 100
      window: 60s
      scope: user
      action: block
      message: "Rate limit exceeded. Please try again later."
```

### Deploy Policy

```bash
curl -X POST ${AGENT_ENDPOINT}/api/v1/policies \
  -H "Content-Type: application/yaml" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  --data-binary @policies/rate-limiting/per-user.yaml
```

### Commit Policies to Git

```bash
git add .
git commit -m "Initial policy configuration"
git push origin main
```

For detailed policy syntax, see [Policy-as-Code](/docs/policies/syntax).

## 4. Integrate with LLM Provider

AxonFlow is LLM-provider agnostic. Configure your preferred provider:

### Option A: AWS Bedrock

**Step 1: Create IAM Role**

```bash
# Create trust policy
cat > bedrock-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "ecs-tasks.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create role
aws iam create-role \
  --role-name AxonFlowBedrockRole \
  --assume-role-policy-document file://bedrock-trust-policy.json

# Attach Bedrock permissions
aws iam attach-role-policy \
  --role-name AxonFlowBedrockRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

**Step 2: Update ECS Task Definition**

Add IAM role to Agent task definition (via CloudFormation update or AWS console).

**Step 3: Configure AxonFlow**

```bash
curl -X POST ${AGENT_ENDPOINT}/api/v1/config/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "provider": "bedrock",
    "region": "us-east-1",
    "model": "anthropic.claude-v2",
    "max_tokens": 4096
  }'
```

### Option B: OpenAI / Anthropic

**Step 1: Store API Key in Secrets Manager**

```bash
aws secretsmanager create-secret \
  --name axonflow-openai-key \
  --secret-string "sk-..." \
  --region us-east-1
```

**Step 2: Grant ECS Task Access**

Update task execution role to allow `secretsmanager:GetSecretValue` for the secret.

**Step 3: Configure AxonFlow**

```bash
curl -X POST ${AGENT_ENDPOINT}/api/v1/config/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "provider": "openai",
    "api_key_secret": "axonflow-openai-key",
    "model": "gpt-4",
    "max_tokens": 4096
  }'
```

## 5. Set Up Monitoring

### Create CloudWatch Dashboard

**Dashboard JSON:**

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AxonFlow", "agent_policy_latency_p95"]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Policy Evaluation Latency (P95)"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AxonFlow", "agent_requests_per_second"]
        ],
        "period": 60,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Request Throughput"
      }
    }
  ]
}
```

**Create Dashboard:**

```bash
aws cloudwatch put-dashboard \
  --dashboard-name AxonFlow-Production \
  --dashboard-body file://dashboard.json
```

### Configure Alarms

**P95 Latency Alarm** (alert if >10ms):

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name axonflow-agent-p95-latency \
  --alarm-description "Alert if P95 latency exceeds 10ms" \
  --metric-name agent_policy_latency_p95 \
  --namespace AxonFlow \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:axonflow-alerts
```

**High Error Rate Alarm**:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name axonflow-high-error-rate \
  --alarm-description "Alert if error rate >1%" \
  --metric-name agent_error_rate \
  --namespace AxonFlow \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:axonflow-alerts
```

For detailed monitoring setup, see [CloudWatch Monitoring](/docs/monitoring/cloudwatch).

## 6. Configure Secrets Management

### Best Practices

1. **Store all credentials in AWS Secrets Manager**
2. **Rotate secrets regularly** (monthly recommended)
3. **Use IAM roles** instead of API keys where possible
4. **Enable secret versioning** for rollback capability

### Example: Store Database Credentials

```bash
aws secretsmanager create-secret \
  --name axonflow/production/database \
  --secret-string '{
    "username": "axonflow",
    "password": "YOUR_SECURE_PASSWORD",
    "engine": "postgres",
    "host": "axonflow-prod-db.abc123.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "axonflow"
  }' \
  --region us-east-1
```

### Enable Automatic Rotation

```bash
aws secretsmanager rotate-secret \
  --secret-id axonflow/production/database \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=30
```

## 7. Network Configuration

### Configure VPC Endpoints (Optional)

For enhanced security and performance, create VPC endpoints:

**Secrets Manager Endpoint:**
```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.secretsmanager \
  --route-table-ids rtb-xyz789 \
  --subnet-ids subnet-private1 subnet-private2
```

**CloudWatch Logs Endpoint:**
```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.logs \
  --route-table-ids rtb-xyz789 \
  --subnet-ids subnet-private1 subnet-private2
```

Benefits:
- No data transfer to internet
- Lower latency
- Reduced NAT Gateway costs

## 8. Security Hardening

### Enable CloudTrail Logging

```bash
aws cloudtrail create-trail \
  --name axonflow-audit \
  --s3-bucket-name company-cloudtrail-logs \
  --is-multi-region-trail \
  --enable-log-file-validation
```

### Enable VPC Flow Logs

```bash
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-abc123 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/axonflow-production
```

### Configure Security Hub

```bash
aws securityhub enable-security-hub
aws securityhub batch-enable-standards \
  --standards-subscription-requests StandardsArn=arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0
```

## 9. Backup Configuration

### Automated RDS Backups

Backups are enabled by default:
- **Retention**: 7 days
- **Backup Window**: 03:00-04:00 UTC
- **Restore**: Use AWS RDS console

### Manual Snapshot

Create manual snapshot before major changes:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier axonflow-prod-db \
  --db-snapshot-identifier axonflow-pre-upgrade-$(date +%Y%m%d)
```

### Export Policies

Backup policies regularly:

```bash
curl ${AGENT_ENDPOINT}/api/v1/policies \
  -H "Authorization: Bearer YOUR_API_KEY" \
  > policies-backup-$(date +%Y%m%d).json

# Commit to git
git add policies-backup-$(date +%Y%m%d).json
git commit -m "Backup policies $(date +%Y-%m-%d)"
git push
```

## 10. Production Checklist

Before going to production, verify:

- [ ] Health check returns "healthy"
- [ ] At least one MCP connector configured and tested
- [ ] Policy-as-code repository created and deployed
- [ ] LLM provider configured
- [ ] CloudWatch dashboard created
- [ ] CloudWatch alarms configured
- [ ] SNS topic for alerts configured
- [ ] Secrets stored in Secrets Manager
- [ ] VPC endpoints created (optional)
- [ ] CloudTrail logging enabled
- [ ] VPC Flow Logs enabled
- [ ] Manual RDS snapshot created
- [ ] Policy backup in git
- [ ] Documentation updated with endpoints
- [ ] Team trained on operations
- [ ] Incident response plan documented

## Next Steps

1. [Configure MCP Connectors](/docs/mcp/overview)
2. [Create Policies](/docs/policies/syntax)
3. [Set Up Monitoring](/docs/monitoring/cloudwatch)
4. [Performance Tuning](/docs/monitoring/performance-tuning)
5. [Troubleshooting](/docs/deployment/troubleshooting)
