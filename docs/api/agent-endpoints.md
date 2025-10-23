# Agent API Reference

The Agent API is the primary interface for policy enforcement and AI agent execution. All endpoints use HTTPS with JSON payloads.

## Base URL

```
https://YOUR_AGENT_ENDPOINT
```

Get your endpoint from CloudFormation stack outputs after deployment.

## Authentication

All API requests require authentication using Bearer tokens:

```bash
Authorization: Bearer YOUR_API_KEY
```

Generate API keys via the admin API or AWS Secrets Manager.

## Health Endpoints

### GET /health

Check Agent service health.

**Request:**

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/health
```

**Response (200 OK):**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "database": "connected",
    "orchestrator": "reachable"
  },
  "timestamp": "2025-10-23T10:30:00Z",
  "uptime_seconds": 86400
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "components": {
    "database": "disconnected",
    "orchestrator": "reachable"
  },
  "errors": ["Database connection timeout"]
}
```

## Policy Endpoints

### POST /api/v1/policies

Create or update a policy.

**Request:**

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/policies \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/yaml" \
  --data-binary @policy.yaml
```

**Request Body (YAML):**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: rate-limit-per-user
spec:
  type: rate-limit
  priority: 100
  rules:
    - limit: 100
      window: 60s
      scope: user
```

**Response (201 Created):**

```json
{
  "id": "pol_abc123",
  "name": "rate-limit-per-user",
  "version": 1,
  "status": "active",
  "created_at": "2025-10-23T10:30:00Z"
}
```

### GET /api/v1/policies

List all policies.

**Request:**

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/api/v1/policies \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `type` | string | Filter by policy type | all |
| `enabled` | boolean | Filter by enabled status | all |
| `limit` | integer | Max results | 100 |
| `offset` | integer | Pagination offset | 0 |

**Response (200 OK):**

```json
{
  "policies": [
    {
      "id": "pol_abc123",
      "name": "rate-limit-per-user",
      "type": "rate-limit",
      "priority": 100,
      "enabled": true,
      "version": 1,
      "created_at": "2025-10-23T10:30:00Z",
      "updated_at": "2025-10-23T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

### GET /api/v1/policies/\{policy_id\}

Get specific policy details.

**Request:**

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/api/v1/policies/pol_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (200 OK):**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: rate-limit-per-user
  id: pol_abc123
  version: 1
  created_at: 2025-10-23T10:30:00Z
spec:
  type: rate-limit
  priority: 100
  rules:
    - limit: 100
      window: 60s
      scope: user
```

### DELETE /api/v1/policies/\{policy_id\}

Delete a policy.

**Request:**

```bash
curl -X DELETE https://YOUR_AGENT_ENDPOINT/api/v1/policies/pol_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (204 No Content)**

### POST /api/v1/policies/validate

Validate policy syntax without creating.

**Request:**

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/policies/validate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/yaml" \
  --data-binary @policy.yaml
```

**Response (200 OK - Valid):**

```json
{
  "valid": true,
  "policy_name": "rate-limit-per-user",
  "warnings": []
}
```

**Response (400 Bad Request - Invalid):**

```json
{
  "valid": false,
  "errors": [
    "spec.rules[0].limit: must be positive integer",
    "spec.type: unknown policy type"
  ]
}
```

## MCP Connector Endpoints

### POST /api/v1/connectors

Create a new MCP connector.

**Request:**

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/connectors \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-redis",
    "type": "redis",
    "config": {
      "host": "redis.internal.company.com",
      "port": 6379,
      "db": 0,
      "password_secret": "axonflow/redis/password",
      "tls": true
    },
    "permissions": {
      "read": ["cache:*", "session:*"],
      "write": ["cache:temp:*"]
    }
  }'
```

**Response (201 Created):**

```json
{
  "id": "conn_abc123",
  "name": "production-redis",
  "type": "redis",
  "status": "active",
  "created_at": "2025-10-23T10:30:00Z"
}
```

### GET /api/v1/connectors

List all connectors.

**Request:**

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/api/v1/connectors \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (200 OK):**

```json
{
  "connectors": [
    {
      "id": "conn_abc123",
      "name": "production-redis",
      "type": "redis",
      "status": "active",
      "health": "healthy",
      "created_at": "2025-10-23T10:30:00Z"
    }
  ],
  "total": 1
}
```

### GET /api/v1/connectors/\{connector_id\}/health

Check connector health.

**Request:**

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (200 OK):**

```json
{
  "connector_id": "conn_abc123",
  "status": "healthy",
  "latency_ms": 5.2,
  "last_check": "2025-10-23T10:35:00Z",
  "details": {
    "connection": "ok",
    "authentication": "ok",
    "permissions": "ok"
  }
}
```

## Agent Execution Endpoints

### POST /api/v1/agent/execute

Execute an AI agent task with policy enforcement.

**Request:**

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/agent/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-User-ID: user@company.com" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "search_flights",
    "params": {
      "origin": "JFK",
      "destination": "LAX",
      "date": "2025-11-01"
    },
    "connectors": ["amadeus-gds"],
    "timeout": "30s"
  }'
```

**Response (200 OK):**

```json
{
  "execution_id": "exec_xyz789",
  "status": "completed",
  "result": {
    "flights": [
      {
        "flight_number": "AA101",
        "departure": "2025-11-01T08:00:00Z",
        "arrival": "2025-11-01T11:30:00Z",
        "price": 299.99
      }
    ]
  },
  "policy_checks": {
    "evaluated": 5,
    "passed": 5,
    "denied": 0
  },
  "execution_time_ms": 234,
  "timestamp": "2025-10-23T10:30:00Z"
}
```

**Response (403 Forbidden - Policy Violation):**

```json
{
  "error": "policy_violation",
  "message": "Rate limit exceeded: 100 requests per minute",
  "policy": "rate-limit-per-user",
  "retry_after": 45
}
```

## Metrics Endpoints

### GET /api/v1/metrics

Get current metrics.

**Request:**

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/api/v1/metrics \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (200 OK):**

```json
{
  "agent": {
    "policy_latency_p50": 3.2,
    "policy_latency_p95": 8.7,
    "policy_latency_p99": 12.4,
    "requests_per_second": 45.6,
    "error_rate": 0.02
  },
  "policies": {
    "total": 12,
    "active": 10,
    "evaluations_per_second": 45.6,
    "denials_per_minute": 2
  },
  "connectors": {
    "total": 3,
    "healthy": 3,
    "average_latency_ms": 15.3
  }
}
```

## Error Responses

### Standard Error Format

All errors use this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error context"
  },
  "request_id": "req_abc123",
  "timestamp": "2025-10-23T10:30:00Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_request` | 400 | Malformed request |
| `authentication_failed` | 401 | Invalid/missing API key |
| `policy_violation` | 403 | Request blocked by policy |
| `not_found` | 404 | Resource not found |
| `rate_limit_exceeded` | 429 | Too many requests |
| `internal_error` | 500 | Server error |
| `service_unavailable` | 503 | Service temporarily unavailable |

## Rate Limits

API rate limits (separate from policy-enforced limits):

| Tier | Requests/Second | Burst |
|------|-----------------|-------|
| Pilot | 10 | 20 |
| Growth | 50 | 100 |
| Enterprise | 200 | 400 |

**Rate Limit Headers:**

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1698057600
```

## Pagination

List endpoints support pagination:

**Request:**

```bash
curl -X GET "https://YOUR_AGENT_ENDPOINT/api/v1/policies?limit=10&offset=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response Headers:**

```
X-Total-Count: 150
Link: <https://...?limit=10&offset=30>; rel="next"
```

## Versioning

API version specified in URL: `/api/v1/...`

Current version: `v1`

## SDKs

Official SDKs available:

- **Python**: `pip install axonflow`
- **Node.js**: `npm install @axonflow/sdk`
- **Go**: `go get github.com/axonflow/sdk-go`

**Example (Python):**

```python
from axonflow import AxonFlow

client = AxonFlow(
    endpoint="https://YOUR_AGENT_ENDPOINT",
    api_key="YOUR_API_KEY"
)

# Execute agent task
result = client.agent.execute(
    task="search_flights",
    params={"origin": "JFK", "destination": "LAX"},
    connectors=["amadeus-gds"]
)
```

## Next Steps

- [Orchestrator API Reference](/docs/api/orchestrator-endpoints)
- [Policy Syntax](/docs/policies/syntax)
- [MCP Connectors](/docs/mcp/overview)
