# AWS Marketplace Deployment

Deploy AxonFlow in your AWS account using the AWS Marketplace Container product. This guide walks you through the end-to-end deployment process using AWS CloudFormation.

## Overview

**AxonFlow In-VPC Deployment** runs entirely within your AWS account, providing:
- **Sub-10ms P95 latency** (vs ~100ms for public SaaS)
- **Complete data privacy** (no data leaves your VPC)
- **Node-based licensing** (Professional: 10 nodes, Enterprise: 50 nodes, Enterprise Plus: unlimited)
- **Production-ready infrastructure** (Multi-AZ RDS, ECS Fargate, ALB)

**Deployment Time:** 15-25 minutes

## Prerequisites

### 1. AWS Account Requirements

- **AWS Account** with appropriate permissions
- **VPC** with at least 2 private subnets across different AZs
- **IAM Permissions:**
  - CloudFormation: Create/Update/Delete stacks
  - ECS: Create services, task definitions
  - RDS: Create DB instances
  - EC2: Create security groups, load balancers
  - IAM: Create roles for ECS tasks

### 2. Required Information

Before deployment, gather:

| Item | Example | Where to Find |
|------|---------|---------------|
| **VPC ID** | `vpc-0123abcd` | VPC Console |
| **Subnet IDs** | `subnet-abc123, subnet-def456` | VPC Console → Subnets (2+ private subnets) |
| **License Key** | `AXON-PRO-12345-ABCDE` | Provided by AxonFlow sales after purchase |
| **ACM Certificate ARN** (optional) | `arn:aws:acm:...` | ACM Console (for HTTPS) |

### 3. License Tiers

| Tier | Max Nodes | Annual Price | Best For |
|------|-----------|--------------|----------|
| **Professional** | 10 | $240K | Small teams, 100K requests/day |
| **Enterprise** | 50 | $720K | Growing companies, 500K requests/day |
| **Enterprise Plus** | Unlimited | Custom | Large enterprises, millions of requests/day |

**Note:** Nodes = total Agent + Orchestrator containers

## Deployment Steps

### Option 1: AWS Console (Recommended for First Deployment)

#### Step 1: Subscribe to AxonFlow on AWS Marketplace

1. Go to [AWS Marketplace](https://aws.amazon.com/marketplace)
2. Search for **"AxonFlow"**
3. Click **Continue to Subscribe**
4. Review pricing and terms
5. Click **Subscribe**
6. Wait for subscription confirmation (~2 minutes)
7. Click **Continue to Configuration**

#### Step 2: Configure Deployment

1. **Fulfillment Option:** Container
2. **Software Version:** Latest (1.0.0)
3. **Region:** Select your region (e.g., `eu-central-1`)
4. Click **Continue to Launch**

#### Step 3: Launch CloudFormation Stack

1. **Choose Action:** Launch CloudFormation
2. Click **Launch**
3. You'll be redirected to CloudFormation console

#### Step 4: Configure Stack Parameters

**Stack Details:**
- **Stack Name:** `axonflow-production`

**Network Configuration:**
- **VPC ID:** Select your VPC
- **Subnet IDs:** Select 2+ private subnets (different AZs)

**Capacity Configuration:**
- **Agent Desired Count:** `2` (start with 2, scale later)
- **Orchestrator Desired Count:** `2` (start with 2, scale later)
- **Agent Task CPU:** `1024` (1 vCPU)
- **Agent Task Memory:** `2048` (2 GB)
- **Orchestrator Task CPU:** `1024` (1 vCPU)
- **Orchestrator Task Memory:** `2048` (2 GB)

**Database Configuration:**
- **DB Instance Class:** `db.t3.medium` (2 vCPU, 4 GB) - start small
- **DB Username:** `axonflow_admin` (recommended)
- **DB Password:** Generate secure password (20+ characters)
- **DB Allocated Storage:** `100` GB (gp3 SSD)

**HTTPS Configuration (Optional):**
- **Certificate ARN:** Paste ACM certificate ARN or leave blank for HTTP

**License Configuration:**
- **License Tier:** Select `Professional`, `Enterprise`, or `EnterprisePlus`

#### Step 5: Deploy

1. Acknowledge IAM resource creation
2. Click **Create Stack**
3. Wait 15-25 minutes for deployment

**Stack Events to Watch:**
- `CREATE_IN_PROGRESS`: Stack creation started
- `AgentService CREATE_IN_PROGRESS`: Agent tasks starting (~10 min)
- `OrchestratorService CREATE_IN_PROGRESS`: Orchestrator tasks starting (~12 min)
- `CREATE_COMPLETE`: Deployment successful

### Option 2: AWS CLI (For Automation)

#### Step 1: Download CloudFormation Template

Download from AWS Marketplace or AxonFlow:

```bash
curl -O https://axonflow-public-assets.s3.amazonaws.com/cloudformation/ecs-fargate.yaml
```

#### Step 2: Create Parameters File

Create `parameters.json`:

```json
[
  {
    "ParameterKey": "VPC",
    "ParameterValue": "vpc-0123abcd"
  },
  {
    "ParameterKey": "Subnets",
    "ParameterValue": "subnet-abc123,subnet-def456"
  },
  {
    "ParameterKey": "AgentDesiredCount",
    "ParameterValue": "2"
  },
  {
    "ParameterKey": "OrchestratorDesiredCount",
    "ParameterValue": "2"
  },
  {
    "ParameterKey": "DBInstanceClass",
    "ParameterValue": "db.t3.medium"
  },
  {
    "ParameterKey": "DBUsername",
    "ParameterValue": "axonflow_admin"
  },
  {
    "ParameterKey": "DBPassword",
    "ParameterValue": "YOUR_SECURE_PASSWORD_HERE"
  },
  {
    "ParameterKey": "LicenseTier",
    "ParameterValue": "Professional"
  }
]
```

#### Step 3: Deploy Stack

```bash
aws cloudformation create-stack \
  --stack-name axonflow-production \
  --template-body file://ecs-fargate.yaml \
  --parameters file://parameters.json \
  --capabilities CAPABILITY_IAM \
  --region eu-central-1
```

#### Step 4: Monitor Deployment

```bash
aws cloudformation describe-stacks \
  --stack-name axonflow-production \
  --region eu-central-1 \
  --query "Stacks[0].StackStatus"

# Wait for CREATE_COMPLETE
aws cloudformation wait stack-create-complete \
  --stack-name axonflow-production \
  --region eu-central-1
```

## Post-Deployment Configuration

### 1. Retrieve Stack Outputs

Get the Agent endpoint URL:

```bash
aws cloudformation describe-stacks \
  --stack-name axonflow-production \
  --region eu-central-1 \
  --query "Stacks[0].Outputs"
```

**Key Outputs:**
- **AgentEndpoint:** Internal load balancer URL (e.g., `http://internal-axonflow-alb-123.eu-central-1.elb.amazonaws.com`)
- **DatabaseEndpoint:** RDS endpoint (internal use)
- **TierMaxNodes:** Node limit for your tier (10, 50, or -1)
- **TierAnnualPrice:** Annual license price

### 2. Health Check

Verify Agent is healthy:

```bash
curl -s http://internal-axonflow-alb-123.eu-central-1.elb.amazonaws.com/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "agent_version": "1.0.0",
  "license": {
    "tier": "Professional",
    "maxNodes": 10,
    "valid": true
  }
}
```

### 3. Configure Your Application

**TypeScript/Node.js:**

```typescript
import { AxonFlow } from '@axonflow/sdk';

const axonflow = new AxonFlow({
  apiKey: 'your-client-id',  // Provided by AxonFlow
  endpoint: 'http://internal-axonflow-alb-123.eu-central-1.elb.amazonaws.com'
});
```

**Go:**

```go
import "github.com/getaxonflow/axonflow-go"

client := axonflow.NewClientSimple(
    "http://internal-axonflow-alb-123.eu-central-1.elb.amazonaws.com",
    "your-client-id",
    "your-client-secret",
)
```

### 4. Test End-to-End

Test a simple query:

```bash
curl -X POST http://internal-axonflow-alb-123.eu-central-1.elb.amazonaws.com/v1/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-client-id" \
  -d '{
    "prompt": "What is 2+2?",
    "mode": "chat"
  }'
```

Expected: `{"success": true, "data": "4", ...}`

## Scaling

### Auto-Scaling (Automatic)

AxonFlow automatically scales based on CPU utilization:
- **Target:** 70% CPU
- **Scale Out:** Add tasks when CPU > 70%
- **Scale In:** Remove tasks when CPU &lt; 50%
- **Limits:** Min 1, Max 50 tasks per component

### Manual Scaling

Update task counts via CloudFormation:

```bash
aws cloudformation update-stack \
  --stack-name axonflow-production \
  --use-previous-template \
  --parameters \
    ParameterKey=AgentDesiredCount,ParameterValue=5 \
    ParameterKey=OrchestratorDesiredCount,ParameterValue=5 \
  --region eu-central-1
```

**Scaling Guidelines:**

| Request Volume | Recommended Agent | Recommended Orchestrator |
|----------------|-------------------|---------------------------|
| &lt;10K req/day   | 2                 | 2                         |
| 10K-100K req/day | 3-5             | 3-5                       |
| 100K-500K req/day | 10-20          | 10-15                     |
| 500K+ req/day  | 20-50             | 15-30                     |

## Monitoring

### CloudWatch Metrics

AxonFlow publishes metrics to CloudWatch:

**Agent Metrics:**
- `CPUUtilization`: Agent CPU usage
- `MemoryUtilization`: Agent memory usage
- `TargetResponseTime`: Agent latency (P50, P95, P99)
- `RequestCount`: Total requests

**Orchestrator Metrics:**
- `CPUUtilization`: Orchestrator CPU usage
- `MemoryUtilization`: Orchestrator memory usage
- `TaskCount`: Active tasks

**RDS Metrics:**
- `DatabaseConnections`: Active DB connections
- `FreeStorageSpace`: Remaining storage

### CloudWatch Logs

View logs:

```bash
# Agent logs
aws logs tail /ecs/axonflow-agent --follow --region eu-central-1

# Orchestrator logs
aws logs tail /ecs/axonflow-orchestrator --follow --region eu-central-1
```

### Create Alarms

**High CPU Alarm:**

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name axonflow-agent-high-cpu \
  --alarm-description "Agent CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Security Best Practices

### 1. Network Isolation

- Deploy in **private subnets** (no internet gateway)
- Use **internal ALB** (not internet-facing)
- Control access with **security groups**

### 2. Database Security

- **Encryption at rest:** Enabled by default
- **Encryption in transit:** SSL/TLS required
- **Automated backups:** 7-day retention
- **Rotate password:** Every 90 days via Secrets Manager

### 3. IAM Roles

- **Least privilege:** ECS task roles have minimal permissions
- **No API keys in containers:** Use AWS Secrets Manager

### 4. License Key Protection

Store license key in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name axonflow/license-key \
  --secret-string "AXON-PRO-12345-ABCDE-67890" \
  --region eu-central-1
```

## Troubleshooting

### Issue 1: Stack Creation Failed

**Symptom:** CloudFormation rollback

**Common Causes:**
- Insufficient IAM permissions
- VPC subnets in same AZ
- Invalid license key

**Solution:**
1. Check CloudFormation Events tab for error
2. Verify VPC has 2+ subnets in different AZs
3. Validate IAM permissions
4. Delete failed stack and retry

### Issue 2: Health Check Failing

**Symptom:** `curl /health` returns 503 or times out

**Solution:**

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster axonflow-cluster \
  --services axonflow-agent-service \
  --region eu-central-1

# Check task health
aws ecs list-tasks \
  --cluster axonflow-cluster \
  --service-name axonflow-agent-service \
  --region eu-central-1

# View task logs
aws logs tail /ecs/axonflow-agent --since 10m --region eu-central-1
```

### Issue 3: License Invalid

**Symptom:** Health check shows `"license": { "valid": false }`

**Solution:**

1. Verify license key format: `AXON-{TIER}-{5 digits}-{5 chars}-{5 chars}`
2. Check expiration date
3. Contact AxonFlow support for license renewal
4. Update license via Secrets Manager or environment variable

### Issue 4: High Latency

**Symptom:** Latency > 10ms P95

**Causes:**
- Insufficient capacity (CPU/memory)
- Database performance issues
- Cross-AZ traffic

**Solution:**

1. Scale up task count
2. Increase task CPU/memory
3. Check RDS performance metrics
4. Use VPC endpoint for SDK connections

## Cost Estimation

### Professional Tier (10 nodes, ~50K requests/day)

**Monthly AWS Costs:**

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **ECS Fargate** | 4 tasks × 1 vCPU × 2GB × 730h | $213 |
| **RDS** | db.t3.medium, 100GB, Multi-AZ | $182 |
| **ALB** | Internal, ~5GB processed | $25 |
| **Data Transfer** | Intra-VPC (free) | $0 |
| **CloudWatch** | Logs 10GB, metrics | $10 |
| **Backup Storage** | 7 days × 100GB | $19 |
| **Total AWS** | | **~$449/month** |
| **License Fee** | Professional tier annual | **$20K/month** |
| **Grand Total** | | **~$20,449/month** |

### Enterprise Tier (50 nodes, ~500K requests/day)

**Monthly AWS Costs:**

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **ECS Fargate** | 20 tasks × 1 vCPU × 2GB × 730h | $1,065 |
| **RDS** | db.m5.xlarge, 500GB, Multi-AZ | $320 |
| **ALB** | Internal, ~50GB processed | $28 |
| **CloudWatch** | Logs 100GB, metrics | $30 |
| **Backup Storage** | 7 days × 500GB | $95 |
| **Total AWS** | | **~$1,538/month** |
| **License Fee** | Enterprise tier annual | **$60K/month** |
| **Grand Total** | | **~$61,538/month** |

**Cost Optimization Tips:**
- Use Reserved Instances for Fargate (save 20-40%)
- Optimize RDS instance size based on actual load
- Enable RDS storage autoscaling
- Use CloudWatch Logs retention policies (7-30 days)

## Upgrading

### Upgrade AxonFlow Version

AWS Marketplace will notify you of new versions. To upgrade:

1. Subscribe to new version in AWS Marketplace
2. Update CloudFormation stack with new container images
3. ECS will perform rolling update (zero downtime)

```bash
aws cloudformation update-stack \
  --stack-name axonflow-production \
  --use-previous-template \
  --parameters \
    ParameterKey=AgentImageTag,ParameterValue=1.1.0 \
    ParameterKey=OrchestratorImageTag,ParameterValue=1.1.0 \
  --region eu-central-1
```

### Upgrade License Tier

Contact AxonFlow sales to upgrade from Professional → Enterprise → Enterprise Plus.

After receiving new license key:

```bash
# Update license in Secrets Manager
aws secretsmanager update-secret \
  --secret-id axonflow/license-key \
  --secret-string "AXON-ENT-67890-FGHIJ-KLMNO" \
  --region eu-central-1

# Restart ECS tasks to apply new license
aws ecs update-service \
  --cluster axonflow-cluster \
  --service axonflow-agent-service \
  --force-new-deployment \
  --region eu-central-1
```

## Support

**Having deployment issues?**

- **Email:** aws-marketplace@getaxonflow.com
- **Documentation:** https://docs.getaxonflow.com
- **Slack:** [Join our community](https://join.slack.com/t/axonflow/)

**Include in your support request:**
- CloudFormation stack name
- AWS region
- Stack events (from CloudFormation console)
- ECS task logs (if applicable)
- License tier

## Next Steps

- Read the [TypeScript SDK Guide](../sdk/typescript-getting-started.md) to integrate AxonFlow
- Read the [Go SDK Guide](../sdk/go-getting-started.md) for Go applications
- Learn about [Authentication](../sdk/authentication.md) and security best practices
- Explore [MCP Connectors](../connectors/amadeus.md) for external data integration

## Additional Resources

- **AWS Marketplace Listing:** [AxonFlow on AWS Marketplace](https://aws.amazon.com/marketplace)
- **CloudFormation Template:** Available in AWS Marketplace
- **Architecture Diagram:** See [Architecture Guide](../architecture/overview.md)
- **Pricing Details:** https://getaxonflow.com/enterprise-pricing

---

**Last Updated:** October 28, 2025
