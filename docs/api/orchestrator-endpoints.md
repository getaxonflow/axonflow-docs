# Orchestrator API Endpoints

**Complete API reference for AxonFlow Orchestrator** - Multi-Agent Parallel execution endpoints.

---

## Overview

The Orchestrator coordinates multi-agent parallel (MAP) execution, allowing multiple agents to process queries simultaneously for 40x faster results.

**Base URL:** `https://YOUR_ORCHESTRATOR_ENDPOINT`
**Port:** 9443 (HTTPS)
**Protocol:** HTTP/2 + TLS 1.3
**Authentication:** License Key (X-License-Key header)

---

## Authentication

All requests require a valid license key in the header:

```http
POST /orchestrator/parallel
Host: YOUR_ORCHESTRATOR_ENDPOINT
Content-Type: application/json
X-License-Key: AXON-V2-xxx-yyy
X-Organization-ID: my-org
```

**Headers:**
- `X-License-Key` (required): Your AxonFlow license key
- `X-Organization-ID` (required): Your organization identifier
- `Content-Type` (required): `application/json`
- `X-Request-ID` (optional): Client-provided request ID for tracing

---

## Endpoints

### 1. Parallel Query Execution

Execute multiple queries in parallel across multiple agents.

**Endpoint:** `POST /orchestrator/parallel`

**Request:**

```json
{
  "queries": [
    {
      "query": "Search flights from SFO to Paris",
      "policy": "package axonflow.policy\ndefault allow = true",
      "mcp": {
        "connector": "amadeus",
        "operation": "search_flights",
        "parameters": {
          "origin": "SFO",
          "destination": "CDG",
          "departure_date": "2025-06-01"
        }
      },
      "context": {
        "user_id": "user-123",
        "query_type": "flights"
      }
    },
    {
      "query": "Search hotels in Paris",
      "policy": "package axonflow.policy\ndefault allow = true",
      "mcp": {
        "connector": "amadeus",
        "operation": "search_hotels",
        "parameters": {
          "city": "Paris",
          "check_in": "2025-06-01",
          "check_out": "2025-06-07"
        }
      },
      "context": {
        "user_id": "user-123",
        "query_type": "hotels"
      }
    }
  ],
  "execution_mode": "parallel",
  "timeout_ms": 30000
}
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "query_index": 0,
      "status": "success",
      "result": {
        "flights": [
          {
            "airline": "Air France",
            "departure": "2025-06-01T10:00:00Z",
            "arrival": "2025-06-01T22:00:00Z",
            "price": 850,
            "currency": "USD"
          }
        ]
      },
      "metadata": {
        "latency_ms": 4,
        "policy_decision": "allow",
        "agent_id": "agent-3",
        "request_id": "req_abc123"
      }
    },
    {
      "query_index": 1,
      "status": "success",
      "result": {
        "hotels": [
          {
            "name": "Hotel Eiffel",
            "stars": 4,
            "price_per_night": 200,
            "currency": "USD"
          }
        ]
      },
      "metadata": {
        "latency_ms": 3,
        "policy_decision": "allow",
        "agent_id": "agent-1",
        "request_id": "req_def456"
      }
    }
  ],
  "execution_summary": {
    "total_queries": 2,
    "successful": 2,
    "failed": 0,
    "total_time_ms": 5234,
    "parallel_speedup": "2.3x",
    "agent_utilization": {
      "agent-1": 1,
      "agent-2": 0,
      "agent-3": 1,
      "agent-4": 0,
      "agent-5": 0
    }
  },
  "request_id": "orch_xyz789"
}
```

**Performance:**
- Sequential execution: 5s + 5s = 10 seconds
- Parallel execution: max(5s, 5s) = 5.2 seconds
- Speedup: 1.9x

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| queries | array | Yes | Array of query objects |
| execution_mode | string | No | "parallel" (default) or "sequential" |
| timeout_ms | integer | No | Timeout in milliseconds (default: 30000) |

**Error Response (400 Bad Request):**

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid query format",
    "details": {
      "query_index": 0,
      "field": "policy",
      "reason": "Policy compilation failed"
    },
    "request_id": "orch_err123"
  }
}
```

---

### 2. Health Check

Check orchestrator service health.

**Endpoint:** `GET /orchestrator/health`

**Request:**

```http
GET /orchestrator/health HTTP/2
Host: YOUR_ORCHESTRATOR_ENDPOINT
```

**Response (200 OK):**

```json
{
  "status": "healthy",
  "version": "1.0.12",
  "uptime_seconds": 3600,
  "components": {
    "database": {
      "status": "connected",
      "latency_ms": 2
    },
    "agents": {
      "status": "healthy",
      "available": 5,
      "desired": 5,
      "healthy_agents": [
        "agent-1",
        "agent-2",
        "agent-3",
        "agent-4",
        "agent-5"
      ]
    },
    "load_balancer": {
      "status": "healthy"
    }
  },
  "timestamp": "2025-11-11T12:00:00Z"
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "version": "1.0.12",
  "components": {
    "database": {
      "status": "connected"
    },
    "agents": {
      "status": "degraded",
      "available": 2,
      "desired": 5,
      "healthy_agents": [
        "agent-1",
        "agent-3"
      ],
      "unhealthy_agents": [
        "agent-2",
        "agent-4",
        "agent-5"
      ]
    }
  },
  "timestamp": "2025-11-11T12:00:00Z"
}
```

---

### 3. Metrics

Get orchestrator performance metrics.

**Endpoint:** `GET /orchestrator/metrics`

**Request:**

```http
GET /orchestrator/metrics HTTP/2
Host: YOUR_ORCHESTRATOR_ENDPOINT
X-License-Key: AXON-V2-xxx-yyy
```

**Response (200 OK):**

```json
{
  "metrics": {
    "requests": {
      "total": 10000,
      "successful": 9800,
      "failed": 200,
      "success_rate": 0.98
    },
    "latency": {
      "p50_ms": 2,
      "p95_ms": 5,
      "p99_ms": 8,
      "max_ms": 15
    },
    "parallel_execution": {
      "total_parallel_queries": 5000,
      "average_speedup": "3.2x",
      "max_speedup_observed": "8.5x"
    },
    "agent_utilization": {
      "agent-1": {
        "queries_processed": 2000,
        "cpu_percent": 45,
        "memory_mb": 512
      },
      "agent-2": {
        "queries_processed": 1950,
        "cpu_percent": 43,
        "memory_mb": 498
      },
      "agent-3": {
        "queries_processed": 2050,
        "cpu_percent": 47,
        "memory_mb": 520
      },
      "agent-4": {
        "queries_processed": 2000,
        "cpu_percent": 44,
        "memory_mb": 505
      },
      "agent-5": {
        "queries_processed": 2000,
        "cpu_percent": 46,
        "memory_mb": 515
      }
    },
    "timestamp": "2025-11-11T12:00:00Z",
    "period_seconds": 3600
  }
}
```

---

## Request/Response Schemas

### Query Object Schema

```typescript
interface QueryRequest {
  query: string;                    // Natural language query
  policy: string;                   // Rego policy content
  mcp?: MCPConfig;                  // MCP connector configuration
  llm?: LLMConfig;                  // LLM configuration
  context?: Record<string, any>;    // Query context
}

interface MCPConfig {
  connector: string;                // Connector name (e.g., "salesforce")
  operation: string;                // Operation name (e.g., "query")
  parameters?: Record<string, any>; // Connector-specific parameters
}

interface LLMConfig {
  provider: string;                 // "aws-bedrock" | "openai" | "anthropic"
  model: string;                    // Model identifier
  temperature?: number;             // 0.0 - 1.0 (default: 0.7)
  max_tokens?: number;              // Maximum response tokens (default: 500)
}
```

### Response Object Schema

```typescript
interface ParallelExecutionResponse {
  results: QueryResult[];
  execution_summary: ExecutionSummary;
  request_id: string;
}

interface QueryResult {
  query_index: number;
  status: "success" | "error";
  result?: any;
  error?: ErrorDetails;
  metadata: QueryMetadata;
}

interface QueryMetadata {
  latency_ms: number;
  policy_decision: "allow" | "deny";
  agent_id: string;
  request_id: string;
  timestamp?: string;
}

interface ExecutionSummary {
  total_queries: number;
  successful: number;
  failed: number;
  total_time_ms: number;
  parallel_speedup: string;
  agent_utilization: Record<string, number>;
}
```

---

## Error Codes

### Orchestrator-Specific Errors

| Code | HTTP Status | Description | Retry? |
|------|-------------|-------------|--------|
| `ORCHESTRATOR_UNAVAILABLE` | 503 | All agents unhealthy | Yes |
| `INSUFFICIENT_AGENTS` | 503 | Not enough agents for parallel execution | Yes |
| `PARALLEL_EXECUTION_FAILED` | 500 | Parallel execution error | Yes |
| `QUERY_TIMEOUT` | 504 | Query exceeded timeout | Maybe |
| `AGENT_COMMUNICATION_ERROR` | 502 | Cannot reach agent | Yes |

### Example Error Response

```json
{
  "error": {
    "code": "INSUFFICIENT_AGENTS",
    "message": "Not enough healthy agents for parallel execution",
    "details": {
      "required_agents": 5,
      "available_agents": 2,
      "healthy_agents": ["agent-1", "agent-3"],
      "unhealthy_agents": ["agent-2", "agent-4", "agent-5"]
    },
    "request_id": "orch_err456",
    "timestamp": "2025-11-11T12:00:00Z"
  }
}
```

---

## Rate Limiting

Orchestrator applies the same rate limits as Agent endpoints:

**Limits:**
- 100 requests/minute per organization
- 10,000 requests/hour per organization
- Parallel queries count as 1 request

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699711200
```

**Rate Limit Exceeded (429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Organization rate limit exceeded",
    "details": {
      "limit": 100,
      "period": "1 minute",
      "reset_at": "2025-11-11T12:01:00Z"
    },
    "request_id": "orch_err789"
  }
}
```

---

## Best Practices

### 1. Optimal Parallel Execution

```typescript
// ✅ Good: 5 queries in parallel (matches 5 agents)
const response = await client.executeParallel([
  { query: 'Query 1', policy },
  { query: 'Query 2', policy },
  { query: 'Query 3', policy },
  { query: 'Query 4', policy },
  { query: 'Query 5', policy }
]);

// ❌ Suboptimal: 10 queries (only 5 agents available)
// Some queries will wait for agents to become available
const response = await client.executeParallel([
  ...tenQueries  // Will execute in batches of 5
]);
```

**Recommendation:** Match parallel query count to available agents for best performance.

---

### 2. Timeout Configuration

```typescript
// Short queries: 10 seconds
const response = await client.executeParallel(queries, {
  timeout_ms: 10000
});

// LLM queries: 30 seconds
const response = await client.executeParallel(llmQueries, {
  timeout_ms: 30000
});

// Complex data queries: 60 seconds
const response = await client.executeParallel(complexQueries, {
  timeout_ms: 60000
});
```

---

### 3. Error Handling

```typescript
const response = await client.executeParallel(queries);

// Check each result
response.results.forEach((result, index) => {
  if (result.status === 'error') {
    console.error(`Query ${index} failed:`, result.error);
    // Handle error for this specific query
  } else {
    console.log(`Query ${index} succeeded:`, result.result);
  }
});

// Check overall success rate
const successRate = response.execution_summary.successful /
                   response.execution_summary.total_queries;

if (successRate < 0.8) {
  console.warn('Success rate below 80% - investigate issues');
}
```

---

### 4. Agent Utilization Monitoring

```typescript
// Get metrics after execution
const metrics = await client.getOrchestratorMetrics();

// Check agent balance
const utilization = metrics.agent_utilization;
const avgQueries = Object.values(utilization)
  .reduce((sum, count) => sum + count, 0) / Object.keys(utilization).length;

Object.entries(utilization).forEach(([agent, queries]) => {
  if (queries < avgQueries * 0.8) {
    console.warn(`${agent} underutilized: ${queries} queries (avg: ${avgQueries})`);
  }
});
```

---

## Performance Optimization

### Parallel Speedup Formula

```
Speedup = Sequential Time / Parallel Time

Example:
- 5 queries × 5 seconds each = 25 seconds (sequential)
- max(5s, 5s, 5s, 5s, 5s) = 5 seconds (parallel)
- Speedup = 25s / 5s = 5x
```

### Theoretical vs Actual Speedup

| Queries | Agents | Theoretical | Actual | Efficiency |
|---------|--------|-------------|--------|------------|
| 2 | 5 | 2.0x | 1.9x | 95% |
| 5 | 5 | 5.0x | 4.5x | 90% |
| 10 | 5 | 2.0x | 1.8x | 90% |
| 20 | 5 | 4.0x | 3.5x | 88% |

**Note:** Overhead from orchestration reduces actual speedup by ~10%.

---

## SDK Support

### TypeScript

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT,
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  organizationId: 'my-org'
});

// Parallel execution
const response = await client.executeParallel([
  { query: 'Query 1', policy: policyContent },
  { query: 'Query 2', policy: policyContent }
]);
```

### Go

```go
import "github.com/axonflow/axonflow-go"

client, _ := axonflow.NewClient(axonflow.Config{
    Endpoint:       os.Getenv("AXONFLOW_ENDPOINT"),
    LicenseKey:     os.Getenv("AXONFLOW_LICENSE_KEY"),
    OrganizationID: "my-org",
})

// Parallel execution
responses, err := client.ExecuteParallel(ctx, []*axonflow.QueryRequest{
    {Query: "Query 1", Policy: policyContent},
    {Query: "Query 2", Policy: policyContent},
})
```

---

## Monitoring

### CloudWatch Metrics

**Available Metrics:**
- `orchestrator.requests.total` - Total requests
- `orchestrator.requests.parallel` - Parallel execution requests
- `orchestrator.latency.p95` - 95th percentile latency
- `orchestrator.errors.rate` - Error rate
- `orchestrator.agents.available` - Available agent count
- `orchestrator.speedup.average` - Average parallel speedup

### CloudWatch Logs

**Log Group:** `/ecs/YOUR-STACK-NAME/orchestrator`

**Example Log Entry:**
```json
{
  "timestamp": "2025-11-11T12:00:00Z",
  "level": "info",
  "message": "Parallel execution completed",
  "queries": 5,
  "successful": 5,
  "failed": 0,
  "total_time_ms": 5234,
  "speedup": "4.5x",
  "agent_utilization": {
    "agent-1": 1,
    "agent-2": 1,
    "agent-3": 1,
    "agent-4": 1,
    "agent-5": 1
  },
  "request_id": "orch_abc123"
}
```

---

## Additional Resources

- **[Agent Endpoints](/docs/api/agent-endpoints)** - Agent API reference
- **[Error Codes](/docs/api/error-codes)** - Complete error reference
- **[Workflow Examples](/docs/tutorials/workflow-examples)** - MAP execution examples
- **[SDK Documentation](/docs/sdk/typescript-getting-started)** - SDK usage

---

## Support

**Questions about Orchestrator API?**

- **Email:** support@getaxonflow.com
- **Documentation:** https://docs.getaxonflow.com
- **API Status:** https://status.getaxonflow.com

---

**API Version:** 1.0.12
**Last Updated:** November 11, 2025
