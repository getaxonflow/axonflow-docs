# CloudFormation Deployment

This guide covers deploying AxonFlow using AWS CloudFormation through the AWS Marketplace.

## Deployment Overview

- **Deployment Time**: 15-20 minutes
- **Deployment Method**: AWS CloudFormation (one-click)
- **Target**: Customer VPC (In-VPC deployment)
- **Prerequisites**: VPC with public and private subnets

## Step 1: Subscribe on AWS Marketplace

1. Navigate to [AWS Marketplace](https://aws.amazon.com/marketplace)
2. Search for "AxonFlow" or use direct link
3. Click "Continue to Subscribe"
4. Review pricing and terms
5. Click "Subscribe"
6. Wait for subscription confirmation (usually instant)

## Step 2: Configure Deployment

After subscribing, click "Continue to Configuration":

### Select Region

Choose your preferred AWS Region. Consider:

- **Proximity to Users**: Lower latency
- **Data Residency**: Compliance requirements
- **Service Availability**: All regions support ECS/Fargate

**Recommended Regions:**
- `us-east-1` (N. Virginia) - AWS's most feature-complete region
- `us-west-2` (Oregon) - West coast alternative
- `eu-west-1` (Ireland) - European deployment
- `ap-southeast-1` (Singapore) - Asia-Pacific

### Software Version

Select the latest version (default). Version format: `1.x.x`

## Step 3: Launch CloudFormation

Click "Continue to Launch" and select:

- **Action**: "Launch CloudFormation"
- Click "Launch"

This opens the AWS CloudFormation console.

## Step 4: Create Stack

### Stack Name

Enter a descriptive stack name:

```
axonflow-production
axonflow-pilot
axonflow-staging
```

**Naming Guidelines:**
- Use lowercase with hyphens
- Include environment (prod/staging/dev)
- Maximum 128 characters
- Must be unique in region

### Parameters

#### Pricing Tier

Select your pricing tier:

| Tier | Monthly Cost | Max Requests | MCP Connectors | Max Agents |
|------|--------------|--------------|----------------|------------|
| **Pilot** | $7,000 | 50,000 | 2 | 100 |
| **Growth** | $15,000 | 500,000 | 5 | 1,000 |
| **Enterprise** | $25,000 | Unlimited | Unlimited | Unlimited |

**Recommendation**: Start with Pilot for 4-week evaluation.

#### Network Configuration

**VPC ID** (`VpcId`)
- Select your existing VPC
- Must have internet gateway attached
- Minimum CIDR: /24 (256 IP addresses)

**Public Subnets** (`PublicSubnet1`, `PublicSubnet2`)
- For Application Load Balancer
- Must have route to Internet Gateway
- Must be in different Availability Zones
- Minimum /28 (16 IPs each)

**Private Subnets** (`PrivateSubnet1`, `PrivateSubnet2`)
- For ECS tasks and RDS database
- Must be in different Availability Zones
- Minimum /24 (256 IPs each)
- NAT Gateway recommended (for ECR image pulls)

**Subnet Requirements:**

```
Subnet Layout Example:
├── Public Subnet AZ1:  10.0.1.0/24 (AZ: us-east-1a)
├── Public Subnet AZ2:  10.0.2.0/24 (AZ: us-east-1b)
├── Private Subnet AZ1: 10.0.10.0/24 (AZ: us-east-1a)
└── Private Subnet AZ2: 10.0.11.0/24 (AZ: us-east-1b)
```

#### Database Configuration

**Database Password** (`DBPassword`)
- Minimum 16 characters
- Include uppercase, lowercase, numbers, symbols
- Do NOT use: `@`, `/`, `"`, or spaces
- **Example**: `AxonFlow2025!SecureDB#Pass`

**Store this password securely** - you'll need it for database access.

**Database Instance Class** (`DBInstanceClass`)

| Class | vCPU | RAM | Use Case |
|-------|------|-----|----------|
| `db.t3.medium` | 2 | 4 GB | Pilot/Development (default) |
| `db.t3.large` | 2 | 8 GB | Growth tier |
| `db.r5.large` | 2 | 16 GB | High-memory workloads |
| `db.r5.xlarge` | 4 | 32 GB | Enterprise (high traffic) |

**Recommendation**: Use default `db.t3.medium` for Pilot tier.

#### AxonFlow Configuration

**Agent Desired Count** (`AgentDesiredCount`)
- Default: 5 tasks
- Range: 1-50
- Scales automatically based on CPU
- **Recommendation**: Start with 5

**Orchestrator Desired Count** (`OrchestratorDesiredCount`)
- Default: 10 tasks
- Range: 1-50
- Scales automatically based on CPU
- **Recommendation**: Start with 10

## Step 5: Configure Stack Options

### Tags

Add tags for organization:

```
Key: Environment    Value: Production
Key: Project        Value: AI-Platform
Key: CostCenter     Value: Engineering
Key: Owner          Value: ai-team@company.com
```

### Permissions

**IAM Role**: Leave default (creates new role)

**Stack Policy**: Not required

### Stack Failure Options

**Rollback on failure**: Enabled (recommended)

**Delete newly created resources**: Enabled

## Step 6: Review and Create

1. **Review all parameters carefully**
2. **Acknowledge IAM capabilities**:
   - ☑ "I acknowledge that AWS CloudFormation might create IAM resources"
   - ☑ "I acknowledge that AWS CloudFormation might create IAM resources with custom names"
3. Click **"Submit"** or **"Create stack"**

## Step 7: Monitor Deployment

Watch the CloudFormation console for progress:

### Expected Timeline

| Time | Status | Description |
|------|--------|-------------|
| 0-2 min | CREATE_IN_PROGRESS | Security groups, IAM roles |
| 2-5 min | CREATE_IN_PROGRESS | RDS subnet group |
| 5-15 min | CREATE_IN_PROGRESS | RDS database (longest step) |
| 15-18 min | CREATE_IN_PROGRESS | ECS cluster, task definitions |
| 18-20 min | CREATE_COMPLETE | All resources created |

### Events Tab

Monitor detailed progress:

```
Resource                      Status              Timestamp
AxonFlowDatabase             CREATE_IN_PROGRESS  2025-10-23 10:05:32
AgentSecurityGroup           CREATE_COMPLETE     2025-10-23 10:05:45
DBSecurityGroup              CREATE_COMPLETE     2025-10-23 10:05:47
AxonFlowDatabase             CREATE_COMPLETE     2025-10-23 10:18:22
AgentTaskDefinition          CREATE_COMPLETE     2025-10-23 10:18:55
AgentService                 CREATE_COMPLETE     2025-10-23 10:19:30
```

## Step 8: Retrieve Outputs

After `CREATE_COMPLETE`, go to **Outputs** tab:

### Key Outputs

**AgentEndpoint**
```
https://internal-axonflow-alb-1234567890.us-east-1.elb.amazonaws.com
```
- Your AxonFlow API endpoint
- Use for all API calls
- Internal load balancer (VPC-only)

**DatabaseEndpoint**
```
axonflow-prod-db.abc123xyz.us-east-1.rds.amazonaws.com:5432
```
- PostgreSQL endpoint
- Use for direct database access (if needed)

**ClusterName**
```
axonflow-production-cluster
```
- ECS cluster name
- Use for AWS CLI commands

**Save these values** in your secrets manager or configuration system.

## Common Issues During Deployment

### Issue: "Insufficient subnet capacity"

**Cause**: Private subnets too small for RDS + ECS tasks

**Solution**:
- Use /24 subnets (256 IPs) for private subnets
- Or reduce Agent/Orchestrator desired counts

### Issue: "RDS creation failed - password invalid"

**Cause**: Password contains invalid characters

**Solution**:
- Avoid: `@`, `/`, `"`, spaces
- Use: Letters, numbers, `!`, `#`, `$`, `%`, `^`, `&`, `*`

### Issue: "Stack creation stuck at RDS"

**Cause**: RDS creation takes 10-15 minutes (normal)

**Solution**: Wait patiently, this is expected behavior

### Issue: "Insufficient permissions"

**Cause**: IAM user lacks CloudFormation permissions

**Solution**: Ensure IAM user has:
```json
{
  "Action": [
    "cloudformation:*",
    "ec2:*",
    "rds:*",
    "ecs:*",
    "iam:*",
    "elasticloadbalancing:*",
    "logs:*",
    "secretsmanager:*"
  ],
  "Effect": "Allow",
  "Resource": "*"
}
```

## Post-Deployment Validation

### 1. Test Health Endpoint

```bash
AGENT_ENDPOINT="YOUR_AGENT_ENDPOINT_FROM_OUTPUTS"
curl -k ${AGENT_ENDPOINT}/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "database": "connected",
    "orchestrator": "reachable"
  }
}
```

### 2. Check ECS Services

```bash
aws ecs describe-services \
  --cluster axonflow-production-cluster \
  --services axonflow-production-agent-service \
  --region us-east-1
```

Look for `runningCount` matching `desiredCount`.

### 3. Verify Database

```bash
DB_ENDPOINT="YOUR_DB_ENDPOINT_FROM_OUTPUTS"
DB_PASSWORD="YOUR_DB_PASSWORD"

psql -h ${DB_ENDPOINT} -U axonflow -d axonflow -c "SELECT version();"
```

## Updating the Stack

To modify parameters after deployment:

1. Go to CloudFormation console
2. Select your stack
3. Click "Update"
4. Choose "Use current template"
5. Modify parameters (e.g., increase Agent count)
6. Review and update

**Zero-downtime updates** for:
- Agent/Orchestrator desired counts
- Auto-scaling parameters
- Tags

**Requires brief downtime** for:
- Database instance class changes
- VPC/subnet changes

## Deleting the Stack

To remove AxonFlow:

1. Go to CloudFormation console
2. Select your stack
3. Click "Delete"
4. Confirm deletion

**Important**:
- RDS database creates final snapshot (DeletionPolicy: Snapshot)
- Snapshot name: `[stack-name]-db-final-snapshot-[timestamp]`
- Restore from snapshot if needed later
- ECS tasks terminate gracefully (connection draining)

## Next Steps

1. [Post-Deployment Configuration](/docs/deployment/post-deployment)
2. [Configure MCP Connectors](/docs/mcp/overview)
3. [Set Up Monitoring](/docs/monitoring/cloudwatch)
4. [Create Policies](/docs/policies/syntax)
