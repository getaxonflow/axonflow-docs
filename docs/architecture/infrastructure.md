# Infrastructure Details

This page provides detailed information about the AWS infrastructure components deployed by AxonFlow's CloudFormation template.

## CloudFormation Resources

The AxonFlow CloudFormation stack creates and manages the following AWS resources:

### Networking Components

#### Security Groups

**ALB Security Group**
- **Purpose**: Controls traffic to the Application Load Balancer
- **Inbound Rules**:
  - Port 443 (HTTPS) from 0.0.0.0/0
  - Port 80 (HTTP) from 0.0.0.0/0 (redirects to HTTPS)
- **Outbound Rules**: All traffic allowed

**Agent Security Group**
- **Purpose**: Controls traffic to Agent ECS tasks
- **Inbound Rules**:
  - Port 8080 from ALB Security Group only
- **Outbound Rules**: All traffic allowed

**Orchestrator Security Group**
- **Purpose**: Controls traffic to Orchestrator ECS tasks
- **Inbound Rules**:
  - Port 8081 from Agent Security Group only
- **Outbound Rules**: All traffic allowed

**Database Security Group**
- **Purpose**: Controls traffic to RDS PostgreSQL
- **Inbound Rules**:
  - Port 5432 from Agent Security Group
  - Port 5432 from Orchestrator Security Group
- **Outbound Rules**: None required

#### Application Load Balancer

**Configuration:**
```yaml
Type: Application Load Balancer
Scheme: internal
Subnets: Private subnets in AZ1 and AZ2
Target Group: Agent service (port 8080)
Health Check: GET /health (30s interval)
Protocol: HTTPS (port 443)
Certificate: ACM certificate
```

**Features:**
- HTTP/2 support enabled
- Connection draining: 300 seconds
- Idle timeout: 60 seconds
- Cross-zone load balancing: enabled
- Deletion protection: disabled (can be enabled post-deployment)

### Compute Resources

#### ECS Cluster

**Configuration:**
- **Capacity Providers**: FARGATE, FARGATE_SPOT
- **Default Strategy**: 100% FARGATE
- **Execute Command**: Enabled for debugging
- **Container Insights**: Enabled for monitoring

#### Agent Task Definition

**Resource Allocation:**
```yaml
CPU: 1024 (1 vCPU)
Memory: 2048 MB (2 GB)
Network Mode: awsvpc
Launch Type: FARGATE
```

**Container Specification:**
- **Image**: AWS Marketplace ECR image
- **Port**: 8080
- **Health Check**: `curl -f http://localhost:8080/health`
- **Logging**: CloudWatch Logs (/ecs/[stack-name]/agent)

**Environment Variables:**
- `PORT`: 8080
- `DATABASE_URL`: PostgreSQL connection string
- `ORCHESTRATOR_URL`: Internal orchestrator endpoint
- `TIER`: Pricing tier (Pilot/Growth/Enterprise)
- `MAX_REQUESTS`: Tier-based request limit

#### Orchestrator Task Definition

**Resource Allocation:**
```yaml
CPU: 1024 (1 vCPU)
Memory: 2048 MB (2 GB)
Network Mode: awsvpc
Launch Type: FARGATE
```

**Container Specification:**
- **Image**: AWS Marketplace ECR image
- **Port**: 8081
- **Health Check**: `curl -f http://localhost:8081/health`
- **Logging**: CloudWatch Logs (/ecs/[stack-name]/orchestrator)

**Environment Variables:**
- `PORT`: 8081
- `DATABASE_URL`: PostgreSQL connection string

### ECS Services

#### Agent Service

**Configuration:**
```yaml
Desired Count: 5 (configurable 1-50)
Launch Type: FARGATE
Network: Private subnets (AZ1, AZ2)
Load Balancer: Attached to Agent Target Group
Health Check Grace Period: 60 seconds
```

**Deployment Configuration:**
- **Type**: Rolling update
- **Maximum Percent**: 200% (allows double capacity during updates)
- **Minimum Healthy Percent**: 100% (maintains full capacity)
- **Zero-Downtime Updates**: Enabled

**Auto Scaling:**
- **Metric**: CPU Utilization
- **Target**: 70%
- **Min Capacity**: Configured desired count
- **Max Capacity**: 50 tasks
- **Scale-Out Cooldown**: 60 seconds
- **Scale-In Cooldown**: 300 seconds

#### Orchestrator Service

**Configuration:**
```yaml
Desired Count: 10 (configurable 1-50)
Launch Type: FARGATE
Network: Private subnets (AZ1, AZ2)
Load Balancer: None (internal communication only)
```

**Deployment Configuration:**
- **Type**: Rolling update
- **Maximum Percent**: 200%
- **Minimum Healthy Percent**: 100%

**Auto Scaling:**
- Same configuration as Agent service

### Database Layer

#### RDS PostgreSQL Instance

**Configuration:**
```yaml
Engine: postgres
Engine Version: 15.4
Instance Class: db.t3.medium (configurable)
Allocated Storage: 100 GB
Storage Type: gp3
Multi-AZ: true
Backup Retention: 7 days
```

**Performance:**
- **IOPS**: 3000 (gp3 baseline)
- **Throughput**: 125 MB/s
- **Connection Limit**: ~400 (for db.t3.medium)

**Security:**
- **Encryption at Rest**: Enabled (AWS KMS)
- **Encryption in Transit**: SSL/TLS required
- **Master Username**: axonflow
- **Master Password**: Stored in Secrets Manager
- **Database Name**: axonflow

**Backup Configuration:**
- **Automated Backups**: Enabled
- **Backup Window**: 03:00-04:00 UTC
- **Maintenance Window**: Sunday 04:00-05:00 UTC
- **Snapshot on Delete**: Enabled (DeletionPolicy: Snapshot)

**Monitoring:**
- **Enhanced Monitoring**: 60-second interval
- **Performance Insights**: Enabled (7-day retention)
- **CloudWatch Logs**: PostgreSQL logs exported

#### DB Subnet Group

**Configuration:**
- **Subnets**: Private subnet in AZ1 and AZ2
- **Purpose**: Multi-AZ deployment for RDS

### IAM Roles and Policies

#### Task Execution Role

**Purpose**: Allows ECS to manage task lifecycle

**Managed Policies:**
- `AmazonECSTaskExecutionRolePolicy`

**Custom Policies:**
- Secrets Manager read access (for database password)

**Permissions:**
```yaml
- secretsmanager:GetSecretValue
- ecr:GetAuthorizationToken
- ecr:BatchCheckLayerAvailability
- ecr:GetDownloadUrlForLayer
- ecr:BatchGetImage
- logs:CreateLogStream
- logs:PutLogEvents
```

#### Task Role

**Purpose**: Permissions for running containers

**Custom Policies:**
- CloudWatch Logs write access
- CloudWatch PutMetricData

**Permissions:**
```yaml
- logs:CreateLogStream
- logs:PutLogEvents
- cloudwatch:PutMetricData
```

### Secrets Management

#### Database Password Secret

**Configuration:**
```yaml
Type: AWS::SecretsManager::Secret
Format: JSON
Contents:
  - username: axonflow
  - password: [from parameter]
  - engine: postgres
  - host: [RDS endpoint]
  - port: 5432
  - dbname: axonflow
```

**Rotation**: Not configured (can be enabled post-deployment)

### Monitoring and Logging

#### CloudWatch Log Groups

**Agent Log Group:**
- **Name**: `/ecs/[stack-name]/agent`
- **Retention**: 30 days
- **Format**: JSON (structured logging)

**Orchestrator Log Group:**
- **Name**: `/ecs/[stack-name]/orchestrator`
- **Retention**: 30 days
- **Format**: JSON (structured logging)

#### CloudWatch Metrics

**ECS Metrics:**
- CPUUtilization
- MemoryUtilization
- RunningTaskCount
- DesiredTaskCount

**ALB Metrics:**
- RequestCount
- TargetResponseTime
- HealthyHostCount
- UnhealthyHostCount
- HTTPCode_Target_2XX_Count
- HTTPCode_Target_5XX_Count

**RDS Metrics:**
- DatabaseConnections
- ReadLatency
- WriteLatency
- ReadThroughput
- WriteThroughput
- CPUUtilization
- FreeableMemory

### SSL/TLS Configuration

#### ACM Certificate

**Configuration:**
```yaml
Domain: [stack-name].[region].axonflow.internal
Validation: DNS
Auto-Renewal: Enabled
```

**Usage:**
- ALB HTTPS listener (port 443)
- Minimum TLS Version: TLS 1.2
- Recommended: TLS 1.3

## Resource Naming Convention

All resources are named with the CloudFormation stack name prefix:

```
[StackName]-[ResourceType]-[Identifier]

Examples:
- axonflow-prod-alb
- axonflow-prod-agent-sg
- axonflow-prod-db
```

## Cost Estimate

**Default Configuration (5 agents + 10 orchestrators):**

| Resource | Monthly Cost |
|----------|-------------|
| ECS Fargate (15 tasks × 1 vCPU, 2GB) | ~$220 |
| RDS db.t3.medium (Multi-AZ) | ~$130 |
| Application Load Balancer | ~$20 |
| NAT Gateway (optional) | ~$32 |
| Data Transfer | ~$10-50 |
| CloudWatch Logs | ~$5-10 |
| **Total AWS Infrastructure** | **~$400-500** |

**Plus AxonFlow Licensing:**
- Pilot: $7,000/month
- Growth: $15,000/month
- Enterprise: $25,000/month

## Stack Outputs

After deployment, the CloudFormation stack provides these outputs:

| Output | Description | Example |
|--------|-------------|---------|
| `ClusterName` | ECS cluster name | axonflow-prod-cluster |
| `AgentEndpoint` | HTTPS endpoint for Agent API | https://internal-axonflow-alb-123.us-east-1.elb.amazonaws.com |
| `DatabaseEndpoint` | PostgreSQL endpoint | axonflow-db.abc123.us-east-1.rds.amazonaws.com |
| `PricingTierDeployed` | Selected pricing tier | Growth |
| `AgentServiceName` | Agent ECS service name | axonflow-prod-agent-service |
| `OrchestratorServiceName` | Orchestrator ECS service name | axonflow-prod-orchestrator-service |

## Next Steps

- [Networking Configuration](/docs/architecture/networking)
- [Security Architecture](/docs/architecture/security)
- [Post-Deployment Configuration](/docs/deployment/post-deployment)
