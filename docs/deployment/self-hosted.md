# Self-Hosted Deployment Guide

AxonFlow is available as **open source software** under the Apache 2.0 license. You can run the complete platform locally using docker-compose with no license server or authentication required.

## Overview

Self-hosted mode provides:
- ✅ Full AxonFlow platform (Agent + Orchestrator + Demo App)
- ✅ PostgreSQL database with automatic migrations
- ✅ No license validation or authentication
- ✅ Same features as production deployment
- ✅ Perfect for development, evaluation, and small-scale production

## Quick Start

### Prerequisites

- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later
- **OpenAI API Key**: For LLM features (optional for testing)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Disk**: 10GB free space

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/getaxonflow/axonflow.git
cd axonflow

# 2. Set your OpenAI API key (optional)
export OPENAI_API_KEY=sk-your-key-here

# 3. Start all services
docker-compose up

# 4. Access the demo application
open http://localhost:3000
```

The first startup takes 2-3 minutes to:
- Pull Docker images
- Initialize PostgreSQL database
- Run database migrations
- Start all services

## Services

The docker-compose deployment includes:

| Service | Port | Description |
|---------|------|-------------|
| **Agent** | 8081 | Policy enforcement engine |
| **Orchestrator** | 8082 | Multi-agent coordination |
| **PostgreSQL** | 5432 | Database (localhost only) |
| **Demo App API** | 8080 | Backend API server |
| **Demo App UI** | 3000 | React frontend |

## Verification

### Health Checks

```bash
# Check agent health
curl http://localhost:8081/health

# Check orchestrator health
curl http://localhost:8082/health

# Check demo app
curl http://localhost:3000
```

Expected responses:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "mode": "self-hosted"
}
```

### Service Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f axonflow-agent
docker-compose logs -f axonflow-orchestrator
docker-compose logs -f postgres
```

Look for the self-hosted mode confirmation:
```
🏠 Self-hosted mode: Skipping authentication for client 'demo-client'
```

## Configuration

### Environment Variables

Create a `.env` file to customize your deployment:

```bash
# OpenAI API Key (required for LLM features)
OPENAI_API_KEY=sk-your-key-here

# Anthropic API Key (optional, for Claude models)
ANTHROPIC_API_KEY=

# Self-Hosted Mode (automatically enabled in docker-compose)
SELF_HOSTED_MODE=true

# Database Configuration (auto-configured by docker-compose)
DATABASE_URL=postgres://axonflow:demo123@postgres:5432/axonflow_demo?sslmode=disable

# Local LLM Endpoint (optional, for Ollama or other local models)
LOCAL_LLM_ENDPOINT=http://localhost:11434
```

A template is provided at `.env.example`.

### Using Local LLMs

To use local models (Ollama, LM Studio, etc.) instead of OpenAI:

```bash
# 1. Start your local LLM server
ollama serve

# 2. Update .env
LOCAL_LLM_ENDPOINT=http://host.docker.internal:11434

# 3. Restart services
docker-compose restart
```

## SDK Integration

### TypeScript/JavaScript

```typescript
import { AxonFlow } from '@axonflow/sdk';
import OpenAI from 'openai';

// Connect to self-hosted instance (no license key needed)
const axonflow = new AxonFlow({
  endpoint: 'http://localhost:8081'
  // No authentication required for localhost!
});

// Wrap your OpenAI calls
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await axonflow.protect(async () => {
  return openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello, world!' }]
  });
});
```

### Go

```go
package main

import (
    "github.com/getaxonflow/axonflow-go"
)

func main() {
    // Connect to self-hosted instance (no license key needed)
    client := axonflow.NewClient(axonflow.AxonFlowConfig{
        AgentURL: "http://localhost:8081",
        // No authentication required for localhost!
    })

    resp, err := client.ExecuteQuery(
        "user-token",
        "Hello, world!",
        "chat",
        map[string]interface{}{},
    )
}
```

## Testing

Run the automated integration test:

```bash
bash scripts/test_self_hosted.sh
```

This verifies:
- ✅ All services build successfully
- ✅ All containers are healthy
- ✅ Agent accepts requests without license key
- ✅ Self-hosted mode is active
- ✅ Health checks passing

## Production Use

### When to Use Self-Hosted

**Good for:**
- Development and testing
- Small-scale production (&lt;1000 req/day)
- Air-gapped environments
- Cost-sensitive deployments
- Learning and evaluation

**Not recommended for:**
- High availability requirements (&gt;99.9%)
- Large-scale production (&gt;10K req/day)
- Enterprise compliance needs
- Multi-region deployments

For production workloads, consider [AWS Marketplace deployment](/docs/getting-started#aws-marketplace-deployment-enterprise).

### Scaling Self-Hosted

To scale the self-hosted deployment, modify `docker-compose.yml`:

```yaml
axonflow-agent:
  # ... existing config
  deploy:
    replicas: 3  # Run 3 agent instances

axonflow-orchestrator:
  # ... existing config
  deploy:
    replicas: 5  # Run 5 orchestrator instances
```

Then restart with:
```bash
docker-compose up -d --scale axonflow-agent=3 --scale axonflow-orchestrator=5
```

### Persistence

Database data is persisted in Docker volumes. To back up:

```bash
# Backup database
docker-compose exec postgres pg_dump -U axonflow axonflow_demo > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U axonflow axonflow_demo
```

## Troubleshooting

### Container Fails to Start

```bash
# Check logs
docker-compose logs axonflow-agent

# Common issues:
# 1. Port already in use - Change ports in docker-compose.yml
# 2. Out of memory - Allocate more RAM to Docker
# 3. Database migration failed - Check postgres logs
```

### Health Check Failing

```bash
# Wait for services to fully start (2-3 minutes)
docker-compose ps

# If postgres is unhealthy:
docker-compose restart postgres
```

### Authentication Errors

If you see `X-License-Key header required` errors:

```bash
# Verify SELF_HOSTED_MODE is set in docker-compose.yml
grep SELF_HOSTED_MODE docker-compose.yml

# Should see:
# - SELF_HOSTED_MODE=true
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U axonflow -d axonflow_demo -c "SELECT 1"
```

## Cleanup

Stop and remove all services:

```bash
# Stop services (keeps data)
docker-compose down

# Stop and remove data volumes
docker-compose down -v
```

## Migration to Production

When ready to move to production:

1. **Export Data**:
   ```bash
   docker-compose exec postgres pg_dump -U axonflow axonflow_demo > production-seed.sql
   ```

2. **Deploy to AWS Marketplace**: Follow [Getting Started Guide](/docs/getting-started#aws-marketplace-deployment-enterprise)

3. **Import Data** (if needed):
   ```bash
   # Connect to production RDS and import
   psql $PRODUCTION_DATABASE_URL < production-seed.sql
   ```

4. **Update SDK Configuration**:
   ```typescript
   // Development (self-hosted)
   const axonflow = new AxonFlow({ endpoint: 'http://localhost:8081' });

   // Production (AWS Marketplace)
   const axonflow = new AxonFlow({
     licenseKey: process.env.AXONFLOW_LICENSE_KEY
   });
   ```

## Next Steps

- [SDK Integration Guide](/docs/sdk/overview)
- [MCP Connectors](/docs/mcp/overview)
- [Policy Configuration](/docs/policies/syntax)
- [Examples and Tutorials](/docs/examples/quickstart)

## Support

- **Documentation**: https://docs.getaxonflow.com
- **GitHub Issues**: https://github.com/getaxonflow/axonflow/issues
- **Community**: GitHub Discussions
- **Email**: dev@getaxonflow.com
