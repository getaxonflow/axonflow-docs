# Getting Started with AxonFlow

Welcome to AxonFlow, the enterprise AI control plane providing sub-10ms policy enforcement, multi-agent orchestration, and permission-aware data access for production AI systems.

## What is AxonFlow?

AxonFlow is an enterprise AI governance platform that enables organizations to deploy AI agents safely and at scale. It provides:

- **Sub-10ms Policy Enforcement**: Lightning-fast policy evaluation that doesn't slow down your AI agents
- **Multi-Agent Orchestration (MAP)**: Coordinate multiple AI agents working in parallel for 40x faster execution
- **MCP v0.2 Connector Ecosystem**: Permission-aware data access through standardized connectors
- **In-VPC Deployment**: Your data never leaves your infrastructure
- **Policy-as-Code**: Version-controlled governance policies in your git repository

## Deployment Options

AxonFlow offers two deployment paths:

1. **Self-Hosted (Open Source)** - Free local deployment via docker-compose
2. **AWS Marketplace (Enterprise)** - Production-ready in-VPC deployment

## 🏠 Self-Hosted Deployment (Open Source)

Perfect for development, evaluation, and small-scale deployments. **No license required**.

### Quick Start

```bash
# Clone the repository
git clone https://github.com/getaxonflow/axonflow.git
cd axonflow

# Set your OpenAI API key
export OPENAI_API_KEY=sk-your-key-here

# Start all services
docker-compose up

# Access demo app
open http://localhost:3000
```

That's it! AxonFlow is now running locally with all features:
- ✅ Agent + Orchestrator + PostgreSQL
- ✅ Full policy enforcement
- ✅ MCP connector support
- ✅ No authentication required for localhost

### What You Get

- **Deployment Time**: 2-3 minutes
- **Infrastructure**: Docker Compose (localhost)
- **Database**: PostgreSQL (containerized)
- **Performance**: Full production features, localhost performance
- **Cost**: Free and open source (Apache 2.0)

### Self-Hosted Use Cases

- **Development**: Build and test AI applications locally
- **Evaluation**: Try AxonFlow features before enterprise deployment
- **Small Scale**: Run production workloads without cloud infrastructure
- **Air-Gapped**: Deploy in restricted network environments

### Prerequisites

- Docker and Docker Compose installed
- OpenAI API key (for LLM features)
- 4GB RAM minimum

For detailed self-hosted setup instructions, see [Self-Hosted Deployment Guide](/docs/deployment/self-hosted).

---

## ☁️ AWS Marketplace Deployment (Enterprise)

For production workloads requiring high availability, auto-scaling, and enterprise support.

### Quick Facts

- **Deployment Time**: 15-20 minutes via CloudFormation
- **Deployment Method**: AWS ECS/Fargate (one-click)
- **Target Environment**: Customer VPC (In-VPC deployment)
- **Performance Guarantee**: Sub-10ms P95 latency for policy evaluation
- **Architecture**: Agent (5 tasks) + Orchestrator (10 tasks) + RDS PostgreSQL

### AWS Marketplace Product

AxonFlow is available as a Container product on AWS Marketplace:

- **Product ID**: prod-ievugvj3gmmas
- **Listing**: [AWS Marketplace - AxonFlow](https://aws.amazon.com/marketplace/seller-profile?id=seller-o2ymsaotlum32)
- **Pricing Tiers**:
  - **Pilot**: $7,000/month - 50K requests, 2 connectors, 100 agents
  - **Growth**: $15,000/month - 500K requests, 5 connectors, 1,000 agents
  - **Enterprise**: $25,000/month - Unlimited requests, connectors, and agents

## Prerequisites

Before deploying AxonFlow, ensure you have:

### AWS Account Requirements

- Active AWS account with billing enabled
- IAM permissions for CloudFormation stack creation
- AWS Business Support (recommended for production)

### Network Requirements

- Existing VPC with:
  - 2 public subnets (for Application Load Balancer)
  - 2 private subnets (for Fargate tasks and RDS)
  - Subnets in different Availability Zones
- Internet Gateway attached to VPC
- NAT Gateway (optional, for outbound internet access)

### Technical Knowledge

- Familiarity with AWS console and CloudFormation
- Basic understanding of VPC networking
- Understanding of PostgreSQL database management

## Deployment Steps

### 1. Subscribe on AWS Marketplace

1. Go to [AWS Marketplace](https://aws.amazon.com/marketplace)
2. Search for "AxonFlow"
3. Click "Continue to Subscribe"
4. Accept the terms and conditions

### 2. Launch CloudFormation Stack

1. Click "Continue to Configuration"
2. Select your preferred AWS Region
3. Click "Continue to Launch"
4. Choose "Launch CloudFormation"
5. Click "Launch"

### 3. Configure Stack Parameters

**Pricing Configuration:**
- `PricingTier`: Select Pilot, Growth, or Enterprise

**Network Configuration:**
- `VpcId`: Your VPC ID
- `PublicSubnet1`: Public subnet in AZ1
- `PublicSubnet2`: Public subnet in AZ2
- `PrivateSubnet1`: Private subnet in AZ1
- `PrivateSubnet2`: Private subnet in AZ2

**Database Configuration:**
- `DBPassword`: Strong password (minimum 16 characters)
- `DBInstanceClass`: db.t3.medium (default) or larger

**AxonFlow Configuration:**
- `AgentDesiredCount`: Number of Agent tasks (default: 5)
- `OrchestratorDesiredCount`: Number of Orchestrator tasks (default: 10)

### 4. Create Stack

1. Review all parameters
2. Check "I acknowledge that AWS CloudFormation might create IAM resources"
3. Click "Create Stack"
4. Wait 15-20 minutes for deployment to complete

### 5. Retrieve Endpoints

After deployment, go to the CloudFormation **Outputs** tab:

- `AgentEndpoint`: Your AxonFlow API endpoint
- `DatabaseEndpoint`: PostgreSQL endpoint
- `ClusterName`: ECS cluster name

**Save these values** - you'll need them for configuration.

## Verify Installation

Test the Agent health endpoint:

```bash
curl -k https://YOUR_AGENT_ENDPOINT/health
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

## Next Steps

1. **[Configure MCP Connectors](/docs/mcp/overview)** - Set up data access connectors
2. **[Create Policies](/docs/policies/syntax)** - Define governance rules
3. **[Integrate with LLM Provider](/docs/deployment/post-deployment#integrate-with-llm-provider)** - Connect to AWS Bedrock, OpenAI, or Anthropic
4. **[Set Up Monitoring](/docs/monitoring/cloudwatch)** - Configure CloudWatch dashboards

## Support

- **Documentation**: https://docs.getaxonflow.com
- **Email**: support@getaxonflow.com
- **Response Times**:
  - Pilot: 24 hours
  - Growth: 12 hours
  - Enterprise: 4 hours (24/7 on-call)

## Architecture Overview

AxonFlow deploys into your VPC with the following components:

- **Agent Tasks (5)**: Policy enforcement engine with sub-10ms P95 latency
- **Orchestrator Tasks (10)**: Multi-agent coordination and MAP execution
- **RDS PostgreSQL**: Audit trail and policy storage (Multi-AZ)
- **Application Load Balancer**: Internal HTTPS endpoint (HTTP/2 + TLS 1.3)
- **Auto Scaling**: Automatic scaling based on CPU utilization

For detailed architecture information, see the [Architecture Overview](/docs/architecture/overview).
