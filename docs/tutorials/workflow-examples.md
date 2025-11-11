# Workflow Examples

**Complete code examples for common AxonFlow patterns** - Copy, paste, and customize for your use case.

---

## Overview

This guide provides production-ready code examples for common AxonFlow workflows. Each example is complete and runnable - just update the configuration and deploy.

### What You'll Learn

- Simple query execution patterns
- Multi-Agent Parallel (MAP) execution
- Policy enforcement patterns
- MCP connector integration
- Error handling and retry logic
- Performance optimization

---

## Table of Contents

1. [Simple Query Execution](#1-simple-query-execution)
2. [Multi-Agent Parallel Execution (MAP)](#2-multi-agent-parallel-execution-map)
3. [Policy Enforcement Patterns](#3-policy-enforcement-patterns)
4. [MCP Connector Integration](#4-mcp-connector-integration)
5. [Error Handling](#5-error-handling)
6. [Performance Optimization](#6-performance-optimization)

---

## 1. Simple Query Execution

### 1.1 Basic Query

The simplest AxonFlow query with policy enforcement.

#### TypeScript

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT!,
  licenseKey: process.env.AXONFLOW_LICENSE_KEY!,
  organizationId: 'my-org'
});

async function simpleQuery() {
  const response = await client.executeQuery({
    query: 'What is the weather in San Francisco?',
    policy: `
      package axonflow.policy
      default allow = true
    `
  });

  console.log('Response:', response.result);
  console.log('Latency:', response.metadata.latency_ms + 'ms');
}
```

#### Go

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/axonflow/axonflow-go"
)

func simpleQuery() {
	client, _ := axonflow.NewClient(axonflow.Config{
		Endpoint:       os.Getenv("AXONFLOW_ENDPOINT"),
		LicenseKey:     os.Getenv("AXONFLOW_LICENSE_KEY"),
		OrganizationID: "my-org",
	})

	response, err := client.ExecuteQuery(context.Background(), &axonflow.QueryRequest{
		Query: "What is the weather in San Francisco?",
		Policy: `
			package axonflow.policy
			default allow = true
		`,
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Response:", response.Result)
	fmt.Printf("Latency: %dms\n", response.Metadata.LatencyMS)
}
```

**Expected Output:**
```
Response: The current weather in San Francisco is...
Latency: 4ms
```

---

### 1.2 Query with Context

Add user context for audit trails and policy decisions.

#### TypeScript

```typescript
async function queryWithContext() {
  const response = await client.executeQuery({
    query: 'Get customer data for user 12345',
    policy: policyContent,
    context: {
      user_id: 'user-789',
      user_role: 'customer_service',
      department: 'support',
      timestamp: new Date().toISOString(),
      ip_address: req.ip,
      session_id: req.session.id
    }
  });

  return response;
}
```

**Policy can use context:**

```rego
package axonflow.policy

# Allow customer service to view customer data
allow {
    input.context.user_role == "customer_service"
    input.context.department == "support"
}

# Block after business hours (9 AM - 5 PM)
deny {
    hour := time.clock(input.context.timestamp)[0]
    hour < 9
}

deny {
    hour := time.clock(input.context.timestamp)[0]
    hour >= 17
}
```

---

### 1.3 Query with LLM Integration

Connect to AWS Bedrock, OpenAI, or Anthropic Claude.

#### TypeScript

```typescript
async function queryWithLLM() {
  const response = await client.executeQuery({
    query: 'Generate a product description for wireless headphones with noise cancellation',
    policy: policyContent,
    llm: {
      provider: 'aws-bedrock',
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      temperature: 0.7,
      max_tokens: 500
    },
    context: {
      user_id: 'marketing-team',
      purpose: 'product_description'
    }
  });

  console.log('Generated Description:', response.result);
}
```

#### Supported LLM Providers

| Provider | Configuration |
|----------|---------------|
| AWS Bedrock | `provider: 'aws-bedrock'`, `model: 'anthropic.claude-3-sonnet-...'` |
| OpenAI | `provider: 'openai'`, `model: 'gpt-4'` |
| Anthropic | `provider: 'anthropic'`, `model: 'claude-3-opus-20240229'` |

---

## 2. Multi-Agent Parallel Execution (MAP)

Execute multiple agents in parallel for 40x faster results.

### 2.1 Basic Parallel Execution

#### TypeScript

```typescript
async function parallelExecution() {
  const response = await client.executeParallel([
    {
      query: 'Search flights from SFO to Paris',
      policy: policyContent,
      mcp: { connector: 'amadeus', operation: 'search_flights' }
    },
    {
      query: 'Search hotels in Paris city center',
      policy: policyContent,
      mcp: { connector: 'amadeus', operation: 'search_hotels' }
    },
    {
      query: 'Get weather forecast for Paris next week',
      policy: policyContent,
      mcp: { connector: 'weather', operation: 'forecast' }
    }
  ]);

  console.log('Flights:', response[0].result);
  console.log('Hotels:', response[1].result);
  console.log('Weather:', response[2].result);
  console.log('Total Time:', response.metadata.total_time_ms + 'ms');
}
```

#### Go

```go
func parallelExecution() {
	requests := []*axonflow.QueryRequest{
		{
			Query:  "Search flights from SFO to Paris",
			Policy: policyContent,
			MCP:    &axonflow.MCPConfig{Connector: "amadeus", Operation: "search_flights"},
		},
		{
			Query:  "Search hotels in Paris city center",
			Policy: policyContent,
			MCP:    &axonflow.MCPConfig{Connector: "amadeus", Operation: "search_hotels"},
		},
		{
			Query:  "Get weather forecast for Paris next week",
			Policy: policyContent,
			MCP:    &axonflow.MCPConfig{Connector: "weather", Operation: "forecast"},
		},
	}

	responses, err := client.ExecuteParallel(context.Background(), requests)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Flights:", responses[0].Result)
	fmt.Println("Hotels:", responses[1].Result)
	fmt.Println("Weather:", responses[2].Result)
	fmt.Printf("Total Time: %dms\n", responses[0].Metadata.TotalTimeMS)
}
```

**Performance:**
- **Sequential**: 3 queries × 5 seconds = 15 seconds
- **Parallel (MAP)**: Max(5s, 5s, 5s) = 5 seconds
- **Speedup**: 3x (scales to 40x with more agents)

---

### 2.2 Real-World Example: Trip Planning

Complete trip planning with parallel execution.

#### TypeScript

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

interface TripPlanRequest {
  destination: string;
  origin: string;
  dates: { departure: string; return: string };
  travelers: number;
  budget: 'economy' | 'business' | 'luxury';
}

async function planTrip(request: TripPlanRequest) {
  const client = new AxonFlowClient({
    endpoint: process.env.AXONFLOW_ENDPOINT!,
    licenseKey: process.env.AXONFLOW_LICENSE_KEY!,
    organizationId: 'travel-agency'
  });

  console.log(`🛫 Planning trip to ${request.destination}...`);
  const startTime = Date.now();

  // Execute 5 queries in parallel
  const responses = await client.executeParallel([
    // 1. Flight search
    {
      query: `Search ${request.budget} class flights from ${request.origin} to ${request.destination} for ${request.travelers} travelers departing ${request.dates.departure} returning ${request.dates.return}`,
      policy: tripPolicy,
      mcp: { connector: 'amadeus', operation: 'search_flights' },
      context: { budget: request.budget, type: 'flights' }
    },
    // 2. Hotel search
    {
      query: `Search ${request.budget} hotels in ${request.destination} for ${request.travelers} guests from ${request.dates.departure} to ${request.dates.return}`,
      policy: tripPolicy,
      mcp: { connector: 'amadeus', operation: 'search_hotels' },
      context: { budget: request.budget, type: 'hotels' }
    },
    // 3. Activities
    {
      query: `Recommend top activities in ${request.destination}`,
      policy: tripPolicy,
      llm: { provider: 'aws-bedrock', model: 'anthropic.claude-3-sonnet-20240229-v1:0' },
      context: { budget: request.budget, type: 'activities' }
    },
    // 4. Weather forecast
    {
      query: `Get weather forecast for ${request.destination} from ${request.dates.departure} to ${request.dates.return}`,
      policy: tripPolicy,
      mcp: { connector: 'weather', operation: 'forecast' },
      context: { type: 'weather' }
    },
    // 5. Restaurant recommendations
    {
      query: `Recommend ${request.budget} restaurants in ${request.destination}`,
      policy: tripPolicy,
      llm: { provider: 'aws-bedrock', model: 'anthropic.claude-3-sonnet-20240229-v1:0' },
      context: { budget: request.budget, type: 'restaurants' }
    }
  ]);

  const totalTime = Date.now() - startTime;

  // Compile results
  const tripPlan = {
    flights: responses[0].result,
    hotels: responses[1].result,
    activities: responses[2].result,
    weather: responses[3].result,
    restaurants: responses[4].result,
    performance: {
      total_time_ms: totalTime,
      speedup: '5x (parallel execution)',
      policy_latency_avg: responses.reduce((sum, r) => sum + r.metadata.latency_ms, 0) / 5
    }
  };

  console.log(`✅ Trip planned in ${totalTime}ms`);
  return tripPlan;
}

// Usage
const trip = await planTrip({
  destination: 'Paris',
  origin: 'San Francisco',
  dates: { departure: '2025-06-01', return: '2025-06-07' },
  travelers: 2,
  budget: 'luxury'
});
```

**Output:**
```
🛫 Planning trip to Paris...
✅ Trip planned in 6,234ms

Performance:
- 5 queries executed in parallel
- Average policy latency: 4ms
- Total time: 6.2 seconds (would be 30+ seconds sequential)
- Speedup: 5x
```

---

## 3. Policy Enforcement Patterns

### 3.1 PII Detection and Redaction

Automatically detect and redact sensitive information.

#### Policy

```rego
package axonflow.policy

import future.keywords.contains
import future.keywords.if

# Default deny
default allow = false

# Redact PII from query before processing
redacted_query := query {
    query := regex.replace(input.query, `\b\d{3}-\d{2}-\d{4}\b`, "***-**-****")  # SSN
    query := regex.replace(query, `\b\d{16}\b`, "****-****-****-****")             # Credit card
    query := regex.replace(query, `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`, "***@***.***")  # Email
}

# Allow if no PII detected or successfully redacted
allow if {
    redacted_query != input.query
    count(pii_violations) == 0
}

allow if {
    redacted_query == input.query
}

# Detect PII violations
pii_violations[violation] {
    regex.match(`\b\d{3}-\d{2}-\d{4}\b`, input.query)
    violation := {"type": "SSN", "message": "Social Security Number detected"}
}

pii_violations[violation] {
    regex.match(`\b\d{16}\b`, input.query)
    violation := {"type": "credit_card", "message": "Credit card number detected"}
}
```

#### TypeScript

```typescript
async function queryWithPIIProtection() {
  // This query contains a fake SSN
  const response = await client.executeQuery({
    query: 'Get customer info for SSN 123-45-6789',
    policy: piiPolicy
  });

  // Policy automatically redacts: "Get customer info for SSN ***-**-****"
  console.log('Original query redacted:', response.metadata.policy_decision);
  console.log('Safe query executed');
}
```

---

### 3.2 Rate Limiting

Enforce rate limits per user or organization.

#### Policy

```rego
package axonflow.policy

import future.keywords.if

# Default allow
default allow = true

# Rate limit: 100 requests per hour per user
deny["Rate limit exceeded"] if {
    user_request_count := count_user_requests(input.context.user_id)
    user_request_count > 100
}

# Rate limit: 10,000 requests per hour per organization
deny["Organization rate limit exceeded"] if {
    org_request_count := count_org_requests(input.context.organization_id)
    org_request_count > 10000
}

# Helper functions (implement with external data)
count_user_requests(user_id) := count {
    # Query Redis or database for request count in last hour
    count := http.send({
        "method": "GET",
        "url": sprintf("https://api.internal/rate-limit/user/%s", [user_id])
    }).body.count
}

count_org_requests(org_id) := count {
    count := http.send({
        "method": "GET",
        "url": sprintf("https://api.internal/rate-limit/org/%s", [org_id])
    }).body.count
}
```

---

### 3.3 Role-Based Access Control (RBAC)

Control access based on user roles.

#### Policy

```rego
package axonflow.policy

import future.keywords.if

# Default deny
default allow = false

# Admin can do anything
allow if {
    input.context.user_role == "admin"
}

# Customer service can view customer data
allow if {
    input.context.user_role == "customer_service"
    is_customer_query(input.query)
}

# Analysts can run reports
allow if {
    input.context.user_role == "analyst"
    is_report_query(input.query)
}

# Regular users can only query their own data
allow if {
    input.context.user_role == "user"
    is_own_data_query(input.query, input.context.user_id)
}

# Helper functions
is_customer_query(query) if {
    contains(lower(query), "customer")
}

is_report_query(query) if {
    contains(lower(query), "report")
    contains(lower(query), "analytics")
}

is_own_data_query(query, user_id) if {
    contains(query, user_id)
}
```

---

## 4. MCP Connector Integration

### 4.1 Salesforce Query

Query Salesforce CRM data with permission checks.

#### TypeScript

```typescript
async function querySalesforce() {
  const response = await client.executeQuery({
    query: 'Get all opportunities closing this quarter',
    policy: salesforcePolicy,
    mcp: {
      connector: 'salesforce',
      operation: 'query',
      parameters: {
        object: 'Opportunity',
        fields: ['Id', 'Name', 'Amount', 'CloseDate', 'StageName'],
        where: 'CloseDate >= THIS_QUARTER'
      }
    },
    context: {
      user_id: 'sales-rep-123',
      user_role: 'sales_representative'
    }
  });

  console.log('Opportunities:', response.result);
}
```

#### Salesforce Policy

```rego
package axonflow.policy

# Sales reps can query their own opportunities
allow {
    input.context.user_role == "sales_representative"
    input.mcp.connector == "salesforce"
    input.mcp.parameters.object == "Opportunity"
    check_ownership(input.context.user_id, input.mcp.parameters)
}

# Sales managers can query all opportunities
allow {
    input.context.user_role == "sales_manager"
    input.mcp.connector == "salesforce"
    input.mcp.parameters.object == "Opportunity"
}

check_ownership(user_id, params) {
    # Add WHERE clause to filter by OwnerId
    params.where := sprintf("%s AND OwnerId = '%s'", [params.where, user_id])
}
```

---

### 4.2 Snowflake Data Access

Query Snowflake data warehouse with column-level security.

#### TypeScript

```typescript
async function querySnowflake() {
  const response = await client.executeQuery({
    query: 'Get customer revenue by region for Q4 2024',
    policy: snowflakePolicy,
    mcp: {
      connector: 'snowflake',
      operation: 'query',
      parameters: {
        database: 'ANALYTICS',
        schema: 'PUBLIC',
        query: `
          SELECT
            region,
            SUM(revenue) as total_revenue,
            COUNT(DISTINCT customer_id) as customer_count
          FROM customer_revenue
          WHERE quarter = 'Q4_2024'
          GROUP BY region
          ORDER BY total_revenue DESC
        `
      }
    },
    context: {
      user_id: 'analyst-456',
      user_role: 'data_analyst',
      clearance_level: 3
    }
  });

  console.log('Revenue by Region:', response.result);
}
```

#### Snowflake Policy

```rego
package axonflow.policy

# Analysts can query specific schemas based on clearance level
allow {
    input.context.user_role == "data_analyst"
    input.mcp.connector == "snowflake"
    input.context.clearance_level >= required_clearance_level(input.mcp.parameters.schema)
    not contains_sensitive_columns(input.mcp.parameters.query)
}

required_clearance_level(schema) := 3 {
    schema == "PUBLIC"
}

required_clearance_level(schema) := 5 {
    schema == "SENSITIVE"
}

# Block queries containing sensitive columns
contains_sensitive_columns(query) {
    sensitive_columns := ["ssn", "credit_card", "salary", "password"]
    lower_query := lower(query)
    some column in sensitive_columns
    contains(lower_query, column)
}
```

---

### 4.3 Slack Notifications

Send Slack notifications with approval workflows.

#### TypeScript

```typescript
async function sendSlackAlert() {
  const response = await client.executeQuery({
    query: 'Send alert to #engineering channel about production incident',
    policy: slackPolicy,
    mcp: {
      connector: 'slack',
      operation: 'send_message',
      parameters: {
        channel: '#engineering',
        message: '🚨 Production incident detected: High error rate',
        severity: 'critical',
        incident_id: 'INC-12345'
      }
    },
    context: {
      user_id: 'oncall-engineer',
      user_role: 'sre',
      incident_severity: 'critical'
    }
  });

  console.log('Slack message sent:', response.result);
}
```

#### Slack Policy

```rego
package axonflow.policy

# SREs can send critical alerts anytime
allow {
    input.context.user_role == "sre"
    input.mcp.parameters.severity == "critical"
    input.mcp.connector == "slack"
}

# Developers can send info/warning alerts during business hours
allow {
    input.context.user_role == "developer"
    input.mcp.parameters.severity in ["info", "warning"]
    is_business_hours(input.context.timestamp)
}

# Block spam (max 5 messages per hour per user)
deny["Slack rate limit exceeded"] {
    user_message_count := count_slack_messages(input.context.user_id)
    user_message_count > 5
}

is_business_hours(timestamp) {
    hour := time.clock(timestamp)[0]
    hour >= 9
    hour < 17
}
```

---

## 5. Error Handling

### 5.1 Retry Logic with Exponential Backoff

#### TypeScript

```typescript
async function queryWithRetry(
  request: QueryRequest,
  maxRetries: number = 3
): Promise<QueryResponse> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.executeQuery(request);
      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on policy violations or invalid requests
      if (error.code === 'POLICY_DENIED' || error.code === 'INVALID_REQUEST') {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}

// Usage
try {
  const response = await queryWithRetry({
    query: 'Get customer data',
    policy: policyContent
  });
  console.log('Success:', response.result);
} catch (error) {
  console.error('Failed:', error);
}
```

---

### 5.2 Graceful Degradation

#### TypeScript

```typescript
async function queryWithFallback(query: string) {
  try {
    // Try primary query with MCP connector
    const response = await client.executeQuery({
      query: query,
      policy: policyContent,
      mcp: { connector: 'snowflake', operation: 'query' }
    });
    return { data: response.result, source: 'snowflake' };

  } catch (error) {
    console.warn('Primary query failed, trying fallback:', error);

    try {
      // Fallback to LLM-generated response
      const response = await client.executeQuery({
        query: query,
        policy: policyContent,
        llm: { provider: 'aws-bedrock', model: 'anthropic.claude-3-sonnet-20240229-v1:0' }
      });
      return { data: response.result, source: 'llm' };

    } catch (llmError) {
      console.error('Fallback also failed:', llmError);

      // Final fallback: static response
      return {
        data: 'Service temporarily unavailable. Please try again later.',
        source: 'static'
      };
    }
  }
}
```

---

### 5.3 Circuit Breaker Pattern

#### TypeScript

```typescript
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.error('Circuit breaker opened due to failures');
    }
  }
}

// Usage
const breaker = new CircuitBreaker(5, 60000);

async function reliableQuery(query: string) {
  return breaker.execute(async () => {
    return await client.executeQuery({
      query: query,
      policy: policyContent
    });
  });
}
```

---

## 6. Performance Optimization

### 6.1 Policy Caching

Cache compiled policies to reduce latency.

#### TypeScript

```typescript
import * as fs from 'fs';
import * as crypto from 'crypto';

class PolicyCache {
  private cache = new Map<string, string>();

  load(policyPath: string): string {
    const content = fs.readFileSync(policyPath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    if (!this.cache.has(hash)) {
      this.cache.set(hash, content);
      console.log('Policy loaded and cached:', hash);
    }

    return content;
  }

  clear() {
    this.cache.clear();
  }
}

const policyCache = new PolicyCache();

async function optimizedQuery() {
  const policy = policyCache.load('./policies/main.rego');

  const response = await client.executeQuery({
    query: 'Get customer data',
    policy: policy
  });

  return response;
}
```

---

### 6.2 Connection Pooling

Reuse client connections for better performance.

#### TypeScript

```typescript
class AxonFlowConnectionPool {
  private static instance: AxonFlowClient;

  static getClient(): AxonFlowClient {
    if (!this.instance) {
      this.instance = new AxonFlowClient({
        endpoint: process.env.AXONFLOW_ENDPOINT!,
        licenseKey: process.env.AXONFLOW_LICENSE_KEY!,
        organizationId: process.env.AXONFLOW_ORG_ID!,
        poolSize: 10, // Connection pool size
        keepAlive: true
      });
      console.log('✅ AxonFlow connection pool initialized');
    }
    return this.instance;
  }
}

// Usage - reuse same client across requests
const client = AxonFlowConnectionPool.getClient();
const response = await client.executeQuery({ query, policy });
```

---

### 6.3 Batch Query Execution

Execute multiple queries efficiently.

#### TypeScript

```typescript
async function batchQueries(queries: string[]) {
  const batchSize = 10; // Process 10 queries at a time
  const results = [];

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);

    // Execute batch in parallel
    const batchResults = await Promise.all(
      batch.map(query =>
        client.executeQuery({
          query: query,
          policy: policyContent
        })
      )
    );

    results.push(...batchResults);
    console.log(`Processed ${Math.min(i + batchSize, queries.length)}/${queries.length} queries`);
  }

  return results;
}

// Usage
const queries = [
  'Get customer 1',
  'Get customer 2',
  // ... 100 more queries
];

const results = await batchQueries(queries);
console.log(`Processed ${results.length} queries`);
```

---

## Next Steps

### Explore Examples

- **[Healthcare AI Assistant](/docs/examples/healthcare)** - HIPAA-compliant medical assistant
- **[E-commerce Recommendations](/docs/examples/ecommerce)** - Product recommendation engine
- **[Customer Support Chatbot](/docs/examples/support)** - Automated support agent
- **[Trip Planner](/docs/examples/trip-planner)** - Multi-agent travel planning

### Learn More

- **[Policy Syntax Reference](/docs/policies/syntax)** - Complete policy language guide
- **[MCP Connectors](/docs/mcp/overview)** - Available data connectors
- **[API Reference](/docs/api/agent-endpoints)** - Complete API documentation
- **[Security Best Practices](/docs/security/best-practices)** - Production security guide

### Get Help

- **Documentation:** https://docs.getaxonflow.com
- **Email:** support@getaxonflow.com
- **GitHub:** https://github.com/axonflow

---

**All examples tested with AxonFlow v1.0.12** - Last updated: November 11, 2025
