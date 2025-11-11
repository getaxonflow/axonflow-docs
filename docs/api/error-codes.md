# API Error Codes

**Complete error code reference** - Handle errors gracefully in your applications.

---

## Overview

AxonFlow uses standardized HTTP status codes and error codes for all API responses. This guide helps you understand and handle errors effectively.

### Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "POLICY_DENIED",
    "message": "Query denied by policy",
    "details": {
      "policy_decision": "deny",
      "policy_reason": "User lacks required permission",
      "required_permission": "admin"
    },
    "request_id": "req_abc123xyz",
    "timestamp": "2025-11-11T12:00:00Z"
  }
}
```

---

## Table of Contents

1. [HTTP Status Codes](#http-status-codes)
2. [Error Code Categories](#error-code-categories)
3. [Client Errors (4xx)](#client-errors-4xx)
4. [Server Errors (5xx)](#server-errors-5xx)
5. [Policy Errors](#policy-errors)
6. [MCP Connector Errors](#mcp-connector-errors)
7. [Rate Limiting Errors](#rate-limiting-errors)
8. [Error Handling Best Practices](#error-handling-best-practices)

---

## HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| **200** | OK | Request successful |
| **400** | Bad Request | Invalid request parameters |
| **401** | Unauthorized | Invalid or missing license key |
| **403** | Forbidden | Policy denied the request |
| **404** | Not Found | Endpoint or resource not found |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **502** | Bad Gateway | Upstream service unavailable |
| **503** | Service Unavailable | Service temporarily unavailable |
| **504** | Gateway Timeout | Request timeout |

---

## Error Code Categories

### Client Errors (400-499)

Errors caused by invalid client requests. **Client should not retry without fixing the request.**

### Server Errors (500-599)

Errors caused by server issues. **Client can retry with exponential backoff.**

### Policy Errors (403)

Errors caused by policy denial. **Client should not retry unless policy changes.**

### Rate Limiting (429)

Too many requests. **Client should retry after delay specified in `Retry-After` header.**

---

## Client Errors (4xx)

### INVALID_REQUEST (400)

**Description:** Request is malformed or missing required parameters.

**Example:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required parameter: query",
    "details": {
      "missing_fields": ["query"],
      "valid_fields": ["query", "policy", "context", "llm", "mcp"]
    },
    "request_id": "req_abc123"
  }
}
```

**Common Causes:**
- Missing `query` parameter
- Invalid JSON payload
- Malformed policy syntax
- Invalid MCP configuration

**Solution:**
```typescript
// ✅ Validate request before sending
if (!request.query) {
  throw new Error('Query is required');
}

if (!request.policy) {
  throw new Error('Policy is required');
}

const response = await client.executeQuery(request);
```

---

### INVALID_LICENSE_KEY (401)

**Description:** License key is invalid, expired, or malformed.

**Example:**
```json
{
  "error": {
    "code": "INVALID_LICENSE_KEY",
    "message": "License key validation failed",
    "details": {
      "reason": "License key has expired",
      "expired_at": "2025-01-01T00:00:00Z",
      "organization_id": "my-org"
    },
    "request_id": "req_abc123"
  }
}
```

**Common Causes:**
- License key expired
- Invalid license key format
- License key revoked
- License key for different organization

**Solution:**
```typescript
// Check license key expiration
const licenseKey = process.env.AXONFLOW_LICENSE_KEY;
if (!licenseKey || !licenseKey.startsWith('AXON-')) {
  throw new Error('Invalid license key format');
}

// Retrieve new license key if expired
if (error.code === 'INVALID_LICENSE_KEY' && error.details.reason === 'expired') {
  // Contact AxonFlow support for renewal
  console.error('License key expired. Contact support@getaxonflow.com');
}
```

---

### POLICY_DENIED (403)

**Description:** Policy evaluation resulted in `deny`. Request is forbidden.

**Example:**
```json
{
  "error": {
    "code": "POLICY_DENIED",
    "message": "Query denied by policy",
    "details": {
      "policy_decision": "deny",
      "policy_reasons": [
        "User lacks 'admin' role",
        "Query contains sensitive operation"
      ],
      "policy_file": "main.rego",
      "policy_version": "1.2.3"
    },
    "request_id": "req_abc123"
  }
}
```

**Common Causes:**
- User lacks required permissions
- Policy detects PII or sensitive data
- Rate limit exceeded (policy-enforced)
- Business hours restriction
- Geo-fencing violation

**Solution:**
```typescript
try {
  const response = await client.executeQuery(request);
} catch (error) {
  if (error.code === 'POLICY_DENIED') {
    console.error('Access denied:', error.details.policy_reasons);

    // Show user-friendly message
    throw new Error(`Access denied: ${error.details.policy_reasons.join(', ')}`);
  }
}
```

---

### RESOURCE_NOT_FOUND (404)

**Description:** Requested resource does not exist.

**Example:**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Endpoint not found",
    "details": {
      "path": "/api/v1/invalid-endpoint",
      "method": "POST",
      "available_endpoints": [
        "/api/v1/query",
        "/api/v1/query/parallel",
        "/api/v1/health"
      ]
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Verify endpoint URL
- Check API documentation
- Ensure correct HTTP method

---

### RATE_LIMIT_EXCEEDED (429)

**Description:** Client has exceeded rate limits.

**Example:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "period": "1 hour",
      "current_count": 101,
      "reset_at": "2025-11-11T13:00:00Z",
      "retry_after_seconds": 300
    },
    "request_id": "req_abc123"
  }
}
```

**HTTP Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 300
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699711200
```

**Solution:**
```typescript
try {
  const response = await client.executeQuery(request);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.details.retry_after_seconds;
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return await client.executeQuery(request);
  }
}
```

---

## Server Errors (5xx)

### INTERNAL_SERVER_ERROR (500)

**Description:** Unexpected server error. Please report to AxonFlow support.

**Example:**
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "error_id": "err_abc123",
      "timestamp": "2025-11-11T12:00:00Z",
      "support_email": "support@getaxonflow.com"
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
```typescript
try {
  const response = await client.executeQuery(request);
} catch (error) {
  if (error.code === 'INTERNAL_SERVER_ERROR') {
    // Log error and report to support
    console.error('Internal error:', error.details.error_id);

    // Retry with exponential backoff
    return await retryWithBackoff(() => client.executeQuery(request));
  }
}
```

---

### DATABASE_ERROR (500)

**Description:** Database connection or query error.

**Example:**
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database connection failed",
    "details": {
      "reason": "Connection timeout",
      "database": "PostgreSQL",
      "retry_recommended": true
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Retry with exponential backoff
- Check database health in AWS Console
- Verify RDS instance is running

---

### ORCHESTRATOR_UNAVAILABLE (502)

**Description:** Orchestrator service is unavailable.

**Example:**
```json
{
  "error": {
    "code": "ORCHESTRATOR_UNAVAILABLE",
    "message": "Orchestrator service unavailable",
    "details": {
      "reason": "All orchestrator instances unhealthy",
      "healthy_count": 0,
      "desired_count": 10,
      "retry_recommended": true
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Check ECS service health
- Verify orchestrator tasks are running
- Check CloudWatch logs for errors
- Retry after brief delay

---

### SERVICE_UNAVAILABLE (503)

**Description:** Service temporarily unavailable (maintenance or overload).

**Example:**
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "details": {
      "reason": "Scheduled maintenance",
      "estimated_duration": "30 minutes",
      "retry_after_seconds": 1800
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Wait for maintenance window to complete
- Retry after `retry_after_seconds`
- Check AxonFlow status page

---

### REQUEST_TIMEOUT (504)

**Description:** Request took too long to process.

**Example:**
```json
{
  "error": {
    "code": "REQUEST_TIMEOUT",
    "message": "Request timeout",
    "details": {
      "timeout_seconds": 30,
      "elapsed_seconds": 31,
      "stage": "llm_generation",
      "retry_recommended": true
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
```typescript
// Increase timeout for LLM requests
const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT,
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  timeout: 60000  // 60 seconds
});

// Or split into smaller queries
const response = await client.executeParallel([
  { query: 'Part 1' },
  { query: 'Part 2' }
]);
```

---

## Policy Errors

### POLICY_COMPILATION_ERROR (400)

**Description:** Policy syntax error or compilation failure.

**Example:**
```json
{
  "error": {
    "code": "POLICY_COMPILATION_ERROR",
    "message": "Policy compilation failed",
    "details": {
      "error": "unexpected 'if' keyword",
      "line": 15,
      "column": 5,
      "policy_snippet": "allow if {",
      "suggestion": "Use 'allow {' without 'if' keyword in OPA"
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
```bash
# Validate policy locally before deployment
opa test policy.rego

# Check syntax
opa check policy.rego

# Common mistake: using 'if' incorrectly
# ❌ Wrong:
allow if {
    input.user == "admin"
}

# ✅ Correct:
allow {
    input.user == "admin"
}
```

---

### POLICY_EVALUATION_ERROR (500)

**Description:** Policy evaluation failed during execution.

**Example:**
```json
{
  "error": {
    "code": "POLICY_EVALUATION_ERROR",
    "message": "Policy evaluation failed",
    "details": {
      "error": "undefined function: invalid_function",
      "policy_file": "main.rego",
      "line": 42
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Check policy for undefined functions
- Verify all imports are correct
- Test policy with sample data

---

## MCP Connector Errors

### MCP_CONNECTOR_NOT_FOUND (404)

**Description:** Requested MCP connector is not configured.

**Example:**
```json
{
  "error": {
    "code": "MCP_CONNECTOR_NOT_FOUND",
    "message": "MCP connector not found",
    "details": {
      "connector": "invalid-connector",
      "available_connectors": [
        "salesforce",
        "snowflake",
        "slack",
        "amadeus",
        "postgresql"
      ]
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Verify connector name
- Check available connectors
- Ensure connector is configured in AxonFlow

---

### MCP_AUTHENTICATION_FAILED (401)

**Description:** MCP connector authentication failed.

**Example:**
```json
{
  "error": {
    "code": "MCP_AUTHENTICATION_FAILED",
    "message": "MCP connector authentication failed",
    "details": {
      "connector": "salesforce",
      "reason": "Invalid credentials",
      "credentials_source": "AWS Secrets Manager"
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Verify MCP credentials in Secrets Manager
- Check credential expiration
- Rotate credentials if needed
- Test connector connectivity

---

### MCP_OPERATION_NOT_SUPPORTED (400)

**Description:** MCP connector does not support requested operation.

**Example:**
```json
{
  "error": {
    "code": "MCP_OPERATION_NOT_SUPPORTED",
    "message": "MCP operation not supported",
    "details": {
      "connector": "salesforce",
      "requested_operation": "delete_all",
      "supported_operations": [
        "query",
        "create",
        "update",
        "delete"
      ]
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Check MCP connector documentation
- Use supported operations only
- Request new operation support if needed

---

### MCP_RATE_LIMIT_EXCEEDED (429)

**Description:** MCP connector rate limit exceeded.

**Example:**
```json
{
  "error": {
    "code": "MCP_RATE_LIMIT_EXCEEDED",
    "message": "MCP connector rate limit exceeded",
    "details": {
      "connector": "amadeus",
      "limit": 100,
      "period": "1 hour",
      "current_count": 101,
      "reset_at": "2025-11-11T13:00:00Z"
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Implement client-side rate limiting
- Use caching for repeated queries
- Upgrade connector tier if needed

---

## Rate Limiting Errors

### ORGANIZATION_RATE_LIMIT_EXCEEDED (429)

**Description:** Organization-wide rate limit exceeded.

**Example:**
```json
{
  "error": {
    "code": "ORGANIZATION_RATE_LIMIT_EXCEEDED",
    "message": "Organization rate limit exceeded",
    "details": {
      "organization_id": "my-org",
      "tier": "Growth",
      "limit": 500000,
      "period": "1 month",
      "current_count": 500001,
      "reset_at": "2025-12-01T00:00:00Z"
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Upgrade to higher tier
- Optimize query patterns
- Implement caching
- Reduce unnecessary queries

---

### USER_RATE_LIMIT_EXCEEDED (429)

**Description:** User-specific rate limit exceeded.

**Example:**
```json
{
  "error": {
    "code": "USER_RATE_LIMIT_EXCEEDED",
    "message": "User rate limit exceeded",
    "details": {
      "user_id": "user-123",
      "limit": 100,
      "period": "1 hour",
      "current_count": 101,
      "retry_after_seconds": 300
    },
    "request_id": "req_abc123"
  }
}
```

**Solution:**
- Implement client-side rate limiting
- Queue requests
- Use exponential backoff

---

## Error Handling Best Practices

### 1. Retry Logic with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry client errors (4xx)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Last attempt - throw error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Should not reach here');
}

// Usage
const response = await retryWithBackoff(() =>
  client.executeQuery({ query, policy })
);
```

---

### 2. Error Classification

```typescript
function classifyError(error: AxonFlowError): 'retryable' | 'permanent' | 'rate_limited' {
  // Rate limiting
  if (error.status === 429) {
    return 'rate_limited';
  }

  // Client errors (permanent)
  if (error.status >= 400 && error.status < 500) {
    return 'permanent';
  }

  // Server errors (retryable)
  if (error.status >= 500) {
    return 'retryable';
  }

  return 'permanent';
}

// Usage
try {
  const response = await client.executeQuery(request);
} catch (error) {
  const classification = classifyError(error);

  switch (classification) {
    case 'retryable':
      return await retryWithBackoff(() => client.executeQuery(request));

    case 'rate_limited':
      const retryAfter = error.details.retry_after_seconds;
      await sleep(retryAfter * 1000);
      return await client.executeQuery(request);

    case 'permanent':
      throw new Error(`Permanent error: ${error.message}`);
  }
}
```

---

### 3. Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
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
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

---

### 4. Graceful Degradation

```typescript
async function queryWithFallback(query: string) {
  try {
    // Primary: MCP connector
    return await client.executeQuery({
      query,
      policy,
      mcp: { connector: 'snowflake' }
    });
  } catch (error) {
    if (error.code === 'MCP_AUTHENTICATION_FAILED') {
      // Fallback: LLM
      console.warn('MCP failed, using LLM fallback');
      return await client.executeQuery({
        query,
        policy,
        llm: { provider: 'aws-bedrock' }
      });
    }

    // Final fallback: static response
    return {
      result: 'Service temporarily unavailable',
      source: 'static'
    };
  }
}
```

---

### 5. Logging and Monitoring

```typescript
function logError(error: AxonFlowError, context: any) {
  console.error('AxonFlow error:', {
    code: error.code,
    message: error.message,
    status: error.status,
    request_id: error.request_id,
    context: context,
    timestamp: new Date().toISOString()
  });

  // Send to monitoring service
  monitoring.trackError({
    service: 'axonflow',
    error_code: error.code,
    error_message: error.message,
    severity: error.status >= 500 ? 'high' : 'medium',
    metadata: error.details
  });

  // Alert on critical errors
  if (error.status === 500 || error.code === 'DATABASE_ERROR') {
    alerting.sendAlert({
      title: `AxonFlow Error: ${error.code}`,
      description: error.message,
      severity: 'critical'
    });
  }
}
```

---

## Support

If you encounter an error not documented here, or need assistance:

- **Email:** support@getaxonflow.com
- **Include:** Request ID, error code, timestamp
- **Documentation:** https://docs.getaxonflow.com
- **Status Page:** https://status.getaxonflow.com

---

**All error codes documented as of AxonFlow v1.0.12** - Last updated: November 11, 2025
