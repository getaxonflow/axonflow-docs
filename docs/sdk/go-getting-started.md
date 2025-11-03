# Go SDK - Getting Started

Enterprise-grade Go SDK for AxonFlow AI governance platform. Add invisible AI governance to your Go applications with production-ready features including retry logic, caching, fail-open strategy, and debug mode.

## Installation

```bash
go get github.com/getaxonflow/axonflow-go
```

## Quick Start

### Basic Usage

```go
package main

import (
    "fmt"
    "log"

    "github.com/getaxonflow/axonflow-go"
)

func main() {
    // Initialize with License Key (recommended)
    client := axonflow.NewClient(axonflow.ClientConfig{
        AgentURL:   "https://staging-eu.getaxonflow.com",
        LicenseKey: "your-license-key",  // Enterprise License Key from AxonFlow
    })

    // Execute a governed query
    resp, err := client.ExecuteQuery(
        "user-token",
        "What is the capital of France?",
        "chat",
        map[string]interface{}{},
    )

    if err != nil {
        log.Fatalf("Query failed: %v", err)
    }

    if resp.Blocked {
        log.Printf("Request blocked: %s", resp.BlockReason)
        return
    }

    fmt.Printf("Result: %s\n", resp.Data)
}
```

### Advanced Configuration

```go
import (
    "time"
    "github.com/getaxonflow/axonflow-go"
)

// Full configuration with all features
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   "https://staging-eu.getaxonflow.com",
    LicenseKey: "your-license-key",  // Enterprise License Key
    Mode:       "production",        // or "sandbox"
    Debug:      true,                 // Enable debug logging
    Timeout:    60 * time.Second,

    // Retry configuration (exponential backoff)
    Retry: axonflow.RetryConfig{
        Enabled:      true,
        MaxAttempts:  3,
        InitialDelay: 1 * time.Second,
    },

    // Cache configuration (in-memory with TTL)
    Cache: axonflow.CacheConfig{
        Enabled: true,
        TTL:     60 * time.Second,
    },
})
```

## Production Features

### 1. Automatic Retry with Exponential Backoff

Handle transient failures automatically:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   "https://staging-eu.getaxonflow.com",
    LicenseKey: "your-license-key",
    Retry: axonflow.RetryConfig{
        Enabled:      true,
        MaxAttempts:  3,           // Retry up to 3 times
        InitialDelay: 1 * time.Second,  // 1s, 2s, 4s backoff
    },
})

// Automatically retries on 5xx errors or network failures
resp, err := client.ExecuteQuery(
    "user-123",
    "Analyze this data...",
    "chat",
    nil,
)
```

### 2. In-Memory Caching with TTL

Reduce latency and load with intelligent caching:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   "https://staging-eu.getaxonflow.com",
    LicenseKey: "your-license-key",
    Cache: axonflow.CacheConfig{
        Enabled: true,
        TTL:     60 * time.Second,  // Cache for 60 seconds
    },
})

// First call: hits AxonFlow
resp1, _ := client.ExecuteQuery("token", "query", "chat", nil)

// Second call (within 60s): served from cache
resp2, _ := client.ExecuteQuery("token", "query", "chat", nil)
```

### 3. Fail-Open Strategy (Production Mode)

Never block your users if AxonFlow is unavailable:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   "https://staging-eu.getaxonflow.com",
    LicenseKey: "your-license-key",
    Mode:       "production",  // Fail-open in production
    Debug:      true,
})

// If AxonFlow is unavailable, request proceeds with warning
resp, err := client.ExecuteQuery(...)
// err == nil, resp.Success == true, resp.Error contains warning
```

### 4. Debug Mode

Enable detailed logging during development:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   "https://staging-eu.getaxonflow.com",
    LicenseKey: "your-license-key",
    Debug:      true,  // Logs all requests/responses
})

// Outputs:
// [AxonFlow DEBUG] POST https://staging-eu.getaxonflow.com/v1/execute
// [AxonFlow DEBUG] Request: {"prompt":"...","mode":"chat"}
// [AxonFlow DEBUG] Response: 200 OK
```

## Sandbox Mode

For testing without affecting production:

```go
// Quick sandbox client for testing
client := axonflow.Sandbox("demo-key")

resp, err := client.ExecuteQuery(
    "",
    "Test query with sensitive data: SSN 123-45-6789",
    "chat",
    map[string]interface{}{},
)

// In sandbox, this will be blocked/redacted
if resp.Blocked {
    fmt.Printf("Blocked: %s\n", resp.BlockReason)
}
```

## Environment Variables (Best Practice)

Never hardcode credentials:

```go
import "os"

// Load from environment
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
})
```

**Environment file (`.env`):**

```bash
# SaaS Mode (Public Endpoint)
AXONFLOW_AGENT_URL=https://staging-eu.getaxonflow.com
AXONFLOW_LICENSE_KEY=AXON-ENT-your-org-20250101-abc123def

# In-VPC Mode (Private Endpoint)
AXONFLOW_AGENT_URL=https://YOUR_VPC_IP:8443
AXONFLOW_LICENSE_KEY=AXON-ENT-your-org-20250101-abc123def
```

## VPC Private Endpoint (Low-Latency)

For applications running in AWS VPC, use the private endpoint for sub-10ms latency:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   "https://YOUR_VPC_IP:8443",  // VPC private endpoint (replace YOUR_VPC_IP with your internal IP)
    LicenseKey: "your-license-key",
    Mode:       "production",
})

// Enjoy sub-10ms P99 latency vs ~100ms over public internet
```

**Performance Comparison:**
- **Public endpoint**: ~100ms (internet routing)
- **VPC private endpoint**: &lt;10ms P99 (intra-VPC routing)

**Note:** VPC endpoints require AWS VPC peering setup with AxonFlow infrastructure.

## Error Handling

```go
resp, err := client.ExecuteQuery(
    "user-123",
    "Analyze this data...",
    "chat",
    nil,
)

if err != nil {
    // Network errors, timeouts, or AxonFlow unavailability
    log.Printf("Request failed: %v", err)
    return
}

if resp.Blocked {
    // Policy violation - request blocked by governance rules
    log.Printf("Request blocked: %s", resp.BlockReason)
    log.Printf("Policies evaluated: %v", resp.PolicyInfo.PoliciesEvaluated)
    return
}

if !resp.Success {
    // Request succeeded but returned error from downstream
    log.Printf("Query failed: %s", resp.Error)
    return
}

// Success - use resp.Data or resp.Result
fmt.Printf("Result: %v\n", resp.Data)
```

## Context Integration

Use Go contexts for cancellation and timeouts:

```go
import "context"

// Create context with timeout
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// Execute query with context
resp, err := client.ExecuteQueryWithContext(
    ctx,
    "user-123",
    "Analyze this data...",
    "chat",
    nil,
)

if err == context.DeadlineExceeded {
    log.Println("Query timed out after 30 seconds")
}
```

## MCP Connector Integration

Connect to external data sources using Model Context Protocol (MCP) connectors:

### List Available Connectors

```go
connectors, err := client.ListConnectors()
if err != nil {
    log.Fatalf("Failed to list connectors: %v", err)
}

for _, conn := range connectors {
    fmt.Printf("Connector: %s (%s)\n", conn.Name, conn.Type)
    fmt.Printf("  Description: %s\n", conn.Description)
    fmt.Printf("  Installed: %v\n", conn.Installed)
}
```

### Install a Connector

```go
err := client.InstallConnector(axonflow.ConnectorInstallRequest{
    ConnectorID: "amadeus-travel",
    Name:        "amadeus-prod",
    TenantID:    "your-tenant-id",
    Options: map[string]interface{}{
        "environment": "production",
    },
    Credentials: map[string]string{
        "api_key":    "your-amadeus-key",
        "api_secret": "your-amadeus-secret",
    },
})

if err != nil {
    log.Fatalf("Failed to install connector: %v", err)
}

fmt.Println("Connector installed successfully!")
```

### Query a Connector

```go
// Query the Amadeus connector for flight information
resp, err := client.QueryConnector(
    "amadeus-prod",
    "Find flights from Paris to Amsterdam on Dec 15",
    map[string]interface{}{
        "origin":      "CDG",
        "destination": "AMS",
        "date":        "2025-12-15",
    },
)

if err != nil {
    log.Fatalf("Connector query failed: %v", err)
}

if resp.Success {
    fmt.Printf("Flight data: %v\n", resp.Data)
    // resp.Data contains real Amadeus GDS flight offers
} else {
    fmt.Printf("Query failed: %s\n", resp.Error)
}
```

## Multi-Agent Planning (MAP)

Generate and execute complex multi-step plans using AI agent orchestration:

### Generate a Plan

```go
// Generate a travel planning workflow
plan, err := client.GeneratePlan(
    "Plan a 3-day trip to Paris with moderate budget",
    "travel",  // Domain hint (optional)
)

if err != nil {
    log.Fatalf("Plan generation failed: %v", err)
}

fmt.Printf("Generated plan %s with %d steps\n", plan.PlanID, len(plan.Steps))
fmt.Printf("Complexity: %d, Parallel: %v\n", plan.Complexity, plan.Parallel)

for i, step := range plan.Steps {
    fmt.Printf("  Step %d: %s (%s)\n", i+1, step.Name, step.Type)
    fmt.Printf("    Description: %s\n", step.Description)
    fmt.Printf("    Agent: %s\n", step.Agent)
}
```

### Execute a Plan

```go
// Execute the generated plan
execResp, err := client.ExecutePlan(plan.PlanID)
if err != nil {
    log.Fatalf("Plan execution failed: %v", err)
}

fmt.Printf("Plan Status: %s\n", execResp.Status)
fmt.Printf("Duration: %s\n", execResp.Duration)

if execResp.Status == "completed" {
    fmt.Printf("Result:\n%s\n", execResp.Result)

    // Access individual step results
    for stepID, result := range execResp.StepResults {
        fmt.Printf("  %s: %v\n", stepID, result)
    }
} else if execResp.Status == "failed" {
    fmt.Printf("Error: %s\n", execResp.Error)
}
```

### Complete Example: Trip Planning

```go
package main

import (
    "fmt"
    "log"
    "os"

    "github.com/getaxonflow/axonflow-go"
)

func main() {
    // Initialize client
    client := axonflow.NewClient(axonflow.ClientConfig{
        AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
        LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
        Debug:      true,
    })

    // 1. Generate multi-agent plan
    plan, err := client.GeneratePlan(
        "Plan a 3-day trip to Paris for 2 people with moderate budget",
        "travel",
    )
    if err != nil {
        log.Fatalf("Plan generation failed: %v", err)
    }

    fmt.Printf("✅ Generated plan with %d steps (parallel: %v)\n", len(plan.Steps), plan.Parallel)

    // 2. Execute the plan
    fmt.Println("\n🚀 Executing plan...")
    execResp, err := client.ExecutePlan(plan.PlanID)
    if err != nil {
        log.Fatalf("Plan execution failed: %v", err)
    }

    // 3. Display results
    if execResp.Status == "completed" {
        fmt.Printf("\n✅ Plan completed in %s\n", execResp.Duration)
        fmt.Printf("\n📋 Complete Itinerary:\n%s\n", execResp.Result)
    } else {
        fmt.Printf("\n❌ Plan failed: %s\n", execResp.Error)
    }
}
```

## Health Check

Check if AxonFlow Agent is available:

```go
err := client.HealthCheck()
if err != nil {
    log.Printf("AxonFlow Agent is unhealthy: %v", err)
} else {
    log.Println("AxonFlow Agent is healthy")
}
```

## Middleware Pattern

For HTTP servers, create a middleware:

```go
import (
    "net/http"
    "github.com/getaxonflow/axonflow-go"
)

func axonflowMiddleware(client *axonflow.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract user token from request
            userToken := r.Header.Get("Authorization")

            // Wrap the handler
            resp, err := client.ExecuteQuery(
                userToken,
                r.FormValue("prompt"),
                "chat",
                nil,
            )

            if err != nil {
                http.Error(w, "Governance check failed", http.StatusInternalServerError)
                return
            }

            if resp.Blocked {
                http.Error(w, resp.BlockReason, http.StatusForbidden)
                return
            }

            // Continue to next handler
            next.ServeHTTP(w, r)
        })
    }
}

// Usage
http.Handle("/api/chat", axonflowMiddleware(client)(chatHandler))
```

## Concurrent Request Handling

Handle multiple requests concurrently:

```go
import "sync"

func processQueriesConcurrently(client *axonflow.Client, queries []string) {
    var wg sync.WaitGroup
    results := make(chan *axonflow.ExecuteResponse, len(queries))

    for _, query := range queries {
        wg.Add(1)
        go func(q string) {
            defer wg.Done()

            resp, err := client.ExecuteQuery("user-123", q, "chat", nil)
            if err != nil {
                log.Printf("Query failed: %v", err)
                return
            }

            results <- resp
        }(query)
    }

    wg.Wait()
    close(results)

    // Process results
    for resp := range results {
        fmt.Printf("Result: %v\n", resp.Data)
    }
}
```

## Configuration Reference

### ClientConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `AgentURL` | `string` | Required | AxonFlow Agent endpoint URL |
| `LicenseKey` | `string` | Required | Enterprise License Key for authentication |
| `Mode` | `string` | `"production"` | `"production"` or `"sandbox"` |
| `Debug` | `bool` | `false` | Enable debug logging |
| `Timeout` | `time.Duration` | `60s` | Request timeout |
| `Retry.Enabled` | `bool` | `true` | Enable retry logic |
| `Retry.MaxAttempts` | `int` | `3` | Maximum retry attempts |
| `Retry.InitialDelay` | `time.Duration` | `1s` | Initial retry delay (exponential backoff) |
| `Cache.Enabled` | `bool` | `true` | Enable caching |
| `Cache.TTL` | `time.Duration` | `60s` | Cache time-to-live |

## Production Best Practices

### 1. Environment Variables

Never hardcode credentials:

```go
import "os"

client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
})
```

### 2. Fail-Open in Production

Use `Mode: "production"` to fail-open if AxonFlow is unavailable:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
    Mode:       "production",  // Critical for production resilience
})
```

### 3. Enable Caching

Reduce latency for repeated queries:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
    Cache: axonflow.CacheConfig{
        Enabled: true,
        TTL:     60 * time.Second,
    },
})
```

### 4. Enable Retry

Handle transient failures automatically:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
    Retry: axonflow.RetryConfig{
        Enabled:      true,
        MaxAttempts:  3,
        InitialDelay: 1 * time.Second,
    },
})
```

### 5. Debug in Development

Use `Debug: true` during development, disable in production:

```go
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
    Debug:      os.Getenv("ENV") == "development",
})
```

### 6. Health Checks

Monitor AxonFlow availability with periodic health checks:

```go
ticker := time.NewTicker(30 * time.Second)
go func() {
    for range ticker.C {
        if err := client.HealthCheck(); err != nil {
            log.Printf("AxonFlow unhealthy: %v", err)
        }
    }
}()
```

## Examples

Full working examples are available in the [GitHub repository](https://github.com/getaxonflow/axonflow-go/tree/main/examples):

- [Basic Usage](https://github.com/getaxonflow/axonflow-go/blob/main/examples/basic/main.go)
- [MCP Connectors](https://github.com/getaxonflow/axonflow-go/blob/main/examples/connectors/main.go)
- [Multi-Agent Planning](https://github.com/getaxonflow/axonflow-go/blob/main/examples/planning/main.go)

## Testing

### Unit Tests

Mock the client for unit testing:

```go
import "testing"

// Create a mock client interface
type MockAxonFlowClient struct {
    ExecuteQueryFunc func(token, prompt, mode string, context map[string]interface{}) (*axonflow.ExecuteResponse, error)
}

func (m *MockAxonFlowClient) ExecuteQuery(token, prompt, mode string, context map[string]interface{}) (*axonflow.ExecuteResponse, error) {
    return m.ExecuteQueryFunc(token, prompt, mode, context)
}

// Test your code
func TestMyFunction(t *testing.T) {
    mockClient := &MockAxonFlowClient{
        ExecuteQueryFunc: func(token, prompt, mode string, context map[string]interface{}) (*axonflow.ExecuteResponse, error) {
            return &axonflow.ExecuteResponse{
                Success: true,
                Data:    "mocked response",
            }, nil
        },
    }

    // Test your function with mockClient
}
```

### Integration Tests

```go
func TestIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }

    client := axonflow.Sandbox("demo-key")

    resp, err := client.ExecuteQuery(
        "",
        "Test query",
        "chat",
        nil,
    )

    if err != nil {
        t.Fatalf("Integration test failed: %v", err)
    }

    if !resp.Success {
        t.Fatalf("Expected success, got: %s", resp.Error)
    }
}
```

## Performance

### Latency Benchmarks

**Public Endpoint (Internet):**
- P50: ~80ms
- P95: ~120ms
- P99: ~150ms

**VPC Private Endpoint (AWS):**
- P50: 3ms
- P95: 6ms
- P99: 9ms

### Memory Usage

- **Client initialization**: ~2 MB
- **Per request (with caching)**: ~50 KB
- **Cache overhead**: ~1 KB per cached query

### Concurrency

The SDK is safe for concurrent use:

```go
// Create once, use from multiple goroutines
client := axonflow.NewClient(axonflow.ClientConfig{
    AgentURL:   "https://staging-eu.getaxonflow.com",
    LicenseKey: "your-license-key",
})

// Safe to call from multiple goroutines
go func() { client.ExecuteQuery(...) }()
go func() { client.ExecuteQuery(...) }()
```

## Support & Resources

- **Documentation**: https://docs.getaxonflow.com
- **TypeScript SDK**: https://www.npmjs.com/package/@axonflow/sdk
- **GitHub**: https://github.com/getaxonflow/axonflow-go
- **Issues**: https://github.com/getaxonflow/axonflow-go/issues
- **Email**: dev@getaxonflow.com

## Next Steps

- Read the [Authentication Guide](./authentication.md) for security best practices
- Learn about [MCP Connectors](../connectors/amadeus.md) for external data integration
- Explore [Multi-Agent Planning](../architecture/multi-agent-planning.md) for complex workflows
- Check out the [TypeScript SDK](./typescript-getting-started.md) for JavaScript/Node.js projects

## License

MIT - See [LICENSE](https://github.com/getaxonflow/axonflow-go/blob/main/LICENSE)
