# MCP Connectors Overview

Model Context Protocol (MCP) v0.2 is the standardized protocol AxonFlow uses for permission-aware data access across different systems.

## What is MCP?

MCP (Model Context Protocol) provides a standardized way for AI agents to access data from various sources with built-in permission enforcement. AxonFlow implements MCP v0.2, which includes:

- **Permission-Aware Access**: Every data request validates user permissions
- **Standardized Interface**: Same API for different data sources
- **Audit Logging**: Complete trail of data access
- **Error Handling**: Graceful fallbacks and retries

## Available Connectors

AxonFlow supports **7 production-ready connectors** as of November 2025:

| Connector | Type | Status | Use Case | Documentation |
|-----------|------|--------|----------|---------------|
| [PostgreSQL](/docs/mcp/postgresql) | Database | ✅ Production | Relational data access, multi-tenant queries | [Setup Guide](/docs/mcp/postgresql) |
| [Redis](/docs/mcp/redis) | Cache | ✅ Production | Distributed rate limiting, session management | [Setup Guide](/docs/mcp/redis) |
| [Slack](/docs/mcp/connectors/slack) | Communication | ✅ Production | Team notifications, alerts, messaging | [Setup Guide](/docs/mcp/connectors/slack) |
| [Salesforce](/docs/mcp/connectors/salesforce) | CRM | ✅ Production | Customer data, leads, SOQL queries | [Setup Guide](/docs/mcp/connectors/salesforce) |
| [Snowflake](/docs/mcp/connectors/snowflake) | Data Warehouse | ✅ Production | Analytics, reporting, large-scale queries | [Setup Guide](/docs/mcp/connectors/snowflake) |
| [Amadeus GDS](/docs/mcp/amadeus) | Travel | ✅ Production | Flight search, hotel booking, real-time pricing | [Setup Guide](/docs/mcp/amadeus) |
| [Cassandra](/docs/mcp/cassandra) | NoSQL | ✅ Production | Booking data, distributed database access | [Setup Guide](/docs/mcp/cassandra) |
| **Custom** | Any | SDK Available | Build your own connector using AxonFlow SDK | [Developer Guide](/docs/mcp/custom) |

**New Connectors (November 2025):**
- **Slack** - OAuth 2.0 bot token authentication for team communication
- **Salesforce** - OAuth 2.0 password grant for CRM data access
- **Snowflake** - Key-pair JWT authentication for data warehouse queries

## Connector Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AI Agent Request                     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   AxonFlow Agent                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Policy Evaluation (&lt;10ms)             │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │         MCP Connector (Permission-Aware)         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │  Amadeus   │  │   Redis    │  │ PostgreSQL │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────┬───────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │      External Data Sources         │
         │  (Amadeus API, Redis, Database)    │
         └────────────────────────────────────┘
```

## Connector Configuration

### Basic Configuration

All connectors share a common configuration structure:

```json
{
  "name": "connector-name",
  "type": "connector-type",
  "config": {
    // Connector-specific configuration
  },
  "permissions": {
    "read": ["resource:pattern"],
    "write": ["resource:pattern"]
  },
  "rate_limits": {
    "requests_per_second": 10,
    "burst": 20
  }
}
```

### Creating a Connector

**API Endpoint:**
```
POST /api/v1/connectors
```

**Example Request:**

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/connectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
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
    },
    "rate_limits": {
      "requests_per_second": 100,
      "burst": 200
    }
  }'
```

**Response:**

```json
{
  "id": "conn_abc123xyz",
  "name": "production-redis",
  "type": "redis",
  "status": "active",
  "created_at": "2025-10-23T10:30:00Z",
  "health": "healthy"
}
```

## Permission Model

### Permission Patterns

Permissions use a hierarchical pattern matching system:

```
resource:action:scope

Examples:
- "cache:*" - All cache operations
- "cache:read:*" - Read from any cache key
- "cache:read:user:*" - Read user-specific cache
- "database:query:customers" - Query customers table
- "api:call:payments:*" - Call any payments API
```

### Permission Evaluation

When an agent requests data:

1. **Policy Check**: Validate user has permission
2. **Resource Match**: Check resource against connector permissions
3. **Action Validation**: Ensure action is allowed (read/write)
4. **Scope Enforcement**: Apply data filtering based on scope
5. **Audit Log**: Record access attempt

### Example Permission Configuration

```yaml
apiVersion: axonflow.io/v1
kind: ConnectorPermissions
metadata:
  connector: amadeus-gds
spec:
  users:
    - user_id: "user@company.com"
      permissions:
        - "flights:search:*"
        - "hotels:search:*"
        - "bookings:read:own"
  groups:
    - group_id: "travel-agents"
      permissions:
        - "flights:search:*"
        - "flights:book:*"
        - "hotels:search:*"
        - "hotels:book:*"
        - "bookings:*:*"
```

## Connector Lifecycle

### States

| State | Description | Actions Available |
|-------|-------------|-------------------|
| `creating` | Being initialized | None |
| `active` | Ready for use | Use, Test, Update, Disable |
| `disabled` | Temporarily disabled | Enable, Delete |
| `error` | Configuration error | Update, Delete |
| `deleting` | Being removed | None |

### State Transitions

```
creating → active → disabled → active
    ↓         ↓         ↓
  error    error    deleting
    ↓                   ↓
  active            (removed)
```

## Testing Connectors

### Health Check

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

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

### Test Query

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123/test \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "read",
    "resource": "cache:test:key",
    "params": {}
  }'
```

## Monitoring Connectors

### Key Metrics

Monitor these CloudWatch metrics:

- `mcp_connector_requests`: Total requests per connector
- `mcp_connector_latency_p95`: P95 latency
- `mcp_connector_errors`: Error count
- `mcp_connector_permission_denials`: Permission violations

### Example CloudWatch Query

```bash
aws cloudwatch get-metric-statistics \
  --namespace AxonFlow \
  --metric-name mcp_connector_latency_p95 \
  --dimensions Name=ConnectorId,Value=conn_abc123 \
  --start-time 2025-10-23T00:00:00Z \
  --end-time 2025-10-23T23:59:59Z \
  --period 3600 \
  --statistics Average
```

## Connector List Management

### List All Connectors

```bash
curl -X GET https://YOUR_AGENT_ENDPOINT/api/v1/connectors \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Update Connector

```bash
curl -X PATCH https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_limits": {
      "requests_per_second": 200
    }
  }'
```

### Disable Connector

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123/disable \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Delete Connector

```bash
curl -X DELETE https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Best Practices

1. **Use Secrets Manager**: Never hardcode credentials
2. **Set Rate Limits**: Protect external systems
3. **Test Before Production**: Use `/test` endpoint
4. **Monitor Health**: Regular health checks
5. **Version Control Config**: Store connector configs in git
6. **Least Privilege**: Grant minimum required permissions
7. **Audit Regularly**: Review connector access logs
8. **Use TLS**: Always encrypt connections

## Next Steps

- [Amadeus GDS Connector](/docs/mcp/amadeus)
- [Redis Connector](/docs/mcp/redis)
- [PostgreSQL Connector](/docs/mcp/postgresql)
- [HTTP REST Connector](/docs/mcp/http-rest)
- [Building Custom Connectors](/docs/mcp/custom)
