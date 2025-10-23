# Architecture Overview

AxonFlow is designed as a cloud-native, distributed AI control plane that provides sub-10ms policy enforcement and multi-agent orchestration capabilities.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Customer AWS Account                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Customer VPC                        │ │
│  │                                                        │ │
│  │  ┌──────────────┐         ┌──────────────┐          │ │
│  │  │   Public     │         │   Public     │          │ │
│  │  │  Subnet AZ1  │         │  Subnet AZ2  │          │ │
│  │  │              │         │              │          │ │
│  │  │  ┌────────┐  │         │              │          │ │
│  │  │  │  ALB   │◄─┼─────────┼──────────────┼─────────►│ │
│  │  │  └───┬────┘  │         │              │   HTTPS  │ │
│  │  └──────┼────────┴─────────┴──────────────┘          │ │
│  │         │                                             │ │
│  │  ┌──────┼────────┬─────────────────────────┐         │ │
│  │  │   Private     │      Private            │         │ │
│  │  │  Subnet AZ1   │     Subnet AZ2          │         │ │
│  │  │               │                         │         │ │
│  │  │  ┌─────────┐  │   ┌─────────┐          │         │ │
│  │  │  │ Agent   │  │   │ Agent   │          │         │ │
│  │  │  │ Tasks   │  │   │ Tasks   │          │         │ │
│  │  │  │ (x5)    │  │   │ (x5)    │          │         │ │
│  │  │  └────┬────┘  │   └────┬────┘          │         │ │
│  │  │       │       │        │               │         │ │
│  │  │  ┌────▼────┐  │   ┌────▼────┐          │         │ │
│  │  │  │ Orch.   │  │   │ Orch.   │          │         │ │
│  │  │  │ Tasks   │  │   │ (x10)   │          │         │ │
│  │  │  │ (x10)   │  │   │         │          │         │ │
│  │  │  └────┬────┘  │   └────┬────┘          │         │ │
│  │  │       │       │        │               │         │ │
│  │  │  ┌────▼────────────────▼────┐          │         │ │
│  │  │  │   RDS PostgreSQL         │          │         │ │
│  │  │  │   Multi-AZ              │          │         │ │
│  │  │  └─────────────────────────┘          │         │ │
│  │  └──────────────────────────────────────┘          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Agent Service

The Agent service is the primary entry point for policy enforcement and AI agent execution.

**Key Features:**
- Sub-10ms P95 policy evaluation latency
- HTTP/2 + TLS 1.3 for high-performance communication
- Stateless architecture for horizontal scaling
- Built-in health checks and auto-recovery

**Specifications:**
- **Default Count**: 5 tasks (configurable 1-50)
- **CPU**: 1 vCPU per task
- **Memory**: 2 GB per task
- **Port**: 8080
- **Protocol**: HTTP/2

**Responsibilities:**
- Policy evaluation and enforcement
- Request validation and authentication
- MCP connector orchestration
- Audit logging
- Rate limiting and quota management

### Orchestrator Service

The Orchestrator service handles multi-agent coordination and parallel task execution (MAP).

**Key Features:**
- Multi-Agent Planning (MAP) for parallel execution
- Task scheduling and load balancing
- Inter-agent communication
- 40x performance improvement through parallelization

**Specifications:**
- **Default Count**: 10 tasks (configurable 1-50)
- **CPU**: 1 vCPU per task
- **Memory**: 2 GB per task
- **Port**: 8081
- **Protocol**: HTTP

**Responsibilities:**
- Multi-agent task coordination
- Parallel execution scheduling
- Resource allocation
- Task result aggregation
- Error handling and retries

### Database Layer

PostgreSQL database for persistent storage and audit trails.

**Specifications:**
- **Engine**: PostgreSQL 15.4
- **Deployment**: Multi-AZ for high availability
- **Storage**: 100 GB GP3 (expandable)
- **Encryption**: At-rest encryption enabled
- **Backups**: Automated daily backups (7-day retention)

**Data Stored:**
- Policy definitions and versions
- Audit logs and compliance trails
- MCP connector configurations
- Agent execution history
- Performance metrics

### Application Load Balancer

Internal ALB for routing and SSL termination.

**Features:**
- HTTP/2 support for reduced latency
- TLS 1.3 encryption
- Health checks with automatic failover
- Connection draining for zero-downtime updates

**Configuration:**
- **Type**: Application Load Balancer
- **Scheme**: Internal (in-VPC only)
- **Protocol**: HTTPS (443)
- **Target**: Agent service (port 8080)

## Design Principles

### 1. Performance First

- **Sub-10ms P95 Guarantee**: Every architecture decision optimized for latency
- **HTTP/2**: Binary protocol for reduced overhead
- **Connection Pooling**: Persistent connections to database
- **Stateless Services**: No session affinity required

### 2. Security by Default

- **In-VPC Deployment**: Data never leaves customer infrastructure
- **Encryption Everywhere**: TLS 1.3 in transit, encryption at rest
- **Least Privilege**: Minimal IAM permissions
- **Audit Logging**: Complete trail of all operations

### 3. High Availability

- **Multi-AZ Deployment**: Services and database across availability zones
- **Auto Scaling**: Automatic capacity adjustment
- **Health Checks**: Continuous monitoring with auto-recovery
- **Zero-Downtime Updates**: Rolling deployments

### 4. Observable by Design

- **CloudWatch Integration**: Native AWS monitoring
- **Structured Logging**: JSON logs for easy parsing
- **Custom Metrics**: Policy latency, throughput, error rates
- **Distributed Tracing**: Request flow across services

## Scalability

### Horizontal Scaling

**Agent Service:**
- Scales from 1 to 50 tasks
- Auto-scaling based on CPU utilization (target: 70%)
- Scale-out: 60 seconds
- Scale-in: 300 seconds (5 minutes)

**Orchestrator Service:**
- Scales from 1 to 50 tasks
- Auto-scaling based on CPU utilization (target: 70%)
- Independent scaling from Agent service

### Vertical Scaling

**ECS Tasks:**
- Configurable CPU: 256-4096 (0.25-4 vCPU)
- Configurable Memory: 512-30720 MB (0.5-30 GB)

**RDS Database:**
- Instance types: db.t3.medium to db.r5.xlarge
- Storage: Auto-scaling enabled
- Read replicas: Available for read-heavy workloads

## Performance Characteristics

### Latency

- **Policy Evaluation**: &lt;10ms P95 (guaranteed)
- **Agent Execution**: &lt;30ms P95 (without external calls)
- **MAP Coordination**: &lt;50ms P95 for 10-agent tasks
- **Database Queries**: &lt;5ms P95

### Throughput

**Pilot Tier:**
- 50,000 requests/month
- ~17 requests/minute average
- Burst: 100 requests/second

**Growth Tier:**
- 500,000 requests/month
- ~167 requests/minute average
- Burst: 500 requests/second

**Enterprise Tier:**
- Unlimited requests
- Auto-scaling to handle demand
- Burst: >1,000 requests/second

### Resource Utilization

**Default Configuration (5 agents + 10 orchestrators):**
- Total vCPU: 15 (5 + 10)
- Total Memory: 30 GB (10 + 20)
- Database: db.t3.medium (2 vCPU, 4 GB RAM)
- Total Monthly Cost: ~$400-500 in AWS charges (excluding AxonFlow licensing)

## Integration Points

### Inbound

- **LLM Providers**: AWS Bedrock, OpenAI, Anthropic
- **AI Frameworks**: LangChain, LlamaIndex, custom
- **Application Clients**: REST API, SDKs

### Outbound

- **MCP Connectors**: Amadeus, Redis, PostgreSQL, HTTP REST
- **AWS Services**: Secrets Manager, CloudWatch, Systems Manager
- **Custom Integrations**: Via MCP protocol

## Security Architecture

For detailed security information, see [Security Architecture](/docs/security/architecture).

**Key Security Features:**
- In-VPC deployment (no internet exposure)
- Security groups with least-privilege rules
- IAM roles with minimal permissions
- Secrets Manager for credential storage
- Encryption at rest and in transit
- Complete audit logging

## Next Steps

- [Infrastructure Details](/docs/architecture/infrastructure) - CloudFormation resources
- [Networking](/docs/architecture/networking) - VPC configuration
- [Security](/docs/architecture/security) - Security controls
