# Policy-as-Code Syntax

AxonFlow uses declarative YAML policies for governance. This page documents the policy syntax and structure.

## Policy Structure

All AxonFlow policies follow this basic structure:

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: policy-name
  description: Human-readable description
  labels:
    environment: production
    team: ai-platform
spec:
  type: policy-type
  priority: 100
  enabled: true
  rules:
    - # Rule definition
```

## Metadata Fields

### Required Fields

- **`apiVersion`**: API version (currently `axonflow.io/v1`)
- **`kind`**: Resource type (always `Policy`)
- **`metadata.name`**: Unique policy identifier (lowercase, hyphens only)
- **`spec.type`**: Policy type (see Policy Types below)

### Optional Fields

- **`metadata.description`**: Human-readable description
- **`metadata.labels`**: Key-value labels for organization
- **`spec.priority`**: Evaluation order (0-1000, higher = earlier)
- **`spec.enabled`**: Enable/disable policy (default: `true`)

## Policy Types

### 1. Access Control

Controls who can access what resources.

**Type:** `access-control`

**Example:**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: restrict-customer-data
spec:
  type: access-control
  priority: 100
  rules:
    - action: deny
      conditions:
        resource: "database:customers:*"
        user_role: "not:admin"
      message: "Customer data access requires admin role"

    - action: allow
      conditions:
        resource: "database:customers:own"
        user_role: "user"
```

### 2. Rate Limiting

Limits request frequency per user, IP, or API key.

**Type:** `rate-limit`

**Example:**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: rate-limit-per-user
spec:
  type: rate-limit
  priority: 90
  rules:
    - limit: 100
      window: 60s
      scope: user
      action: block
      message: "Rate limit exceeded: 100 requests per minute"

    - limit: 1000
      window: 3600s
      scope: user
      action: throttle
      delay: 1s
```

### 3. Data Permissions

Controls what data fields can be accessed.

**Type:** `data-permissions`

**Example:**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: pii-protection
spec:
  type: data-permissions
  priority: 100
  rules:
    - resources:
        - "database:customers:*"
      fields:
        allow: ["id", "name", "email"]
        deny: ["ssn", "credit_card", "password"]
      conditions:
        user_role: "support"

    - resources:
        - "database:customers:*"
      fields:
        allow: ["*"]
      conditions:
        user_role: "admin"
```

### 4. Content Filtering

Filters input/output based on content rules.

**Type:** `content-filter`

**Example:**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: pii-redaction
spec:
  type: content-filter
  priority: 80
  rules:
    - pattern: '\b\d{3}-\d{2}-\d{4}\b'
      replacement: "[SSN-REDACTED]"
      direction: output

    - pattern: '\b\d{16}\b'
      replacement: "[CC-REDACTED]"
      direction: both

    - keywords:
        - "password"
        - "secret"
        - "api_key"
      action: redact
      direction: output
```

### 5. Quota Management

Enforces usage quotas per tier or user.

**Type:** `quota`

**Example:**

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: tier-based-quotas
spec:
  type: quota
  priority: 95
  rules:
    - quota: 50000
      period: monthly
      scope: tier
      conditions:
        tier: "pilot"
      action: block
      message: "Monthly quota exceeded for Pilot tier"

    - quota: 500000
      period: monthly
      scope: tier
      conditions:
        tier: "growth"
      action: block
```

## Rule Fields

### Common Rule Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `action` | string | Action to take (allow/deny/block/throttle) | Yes |
| `conditions` | object | Conditions for rule to apply | Yes |
| `message` | string | Message returned when rule triggered | No |
| `priority` | number | Rule priority within policy | No |

### Conditions

Conditions determine when a rule applies:

```yaml
conditions:
  # User attributes
  user_id: "user@company.com"
  user_role: "admin"
  user_group: "engineering"

  # Resource attributes
  resource: "database:customers:*"
  resource_type: "database"

  # Request attributes
  method: "POST"
  endpoint: "/api/v1/query"

  # Network attributes
  ip: "10.0.0.0/8"

  # Time attributes
  time_of_day: "09:00-17:00"
  day_of_week: "monday-friday"
```

### Condition Operators

Use operators for complex conditions:

```yaml
# Logical operators
conditions:
  user_role: "not:guest"
  resource: "or:[database:*, api:*]"

# Comparison operators
conditions:
  request_size: "gt:1000000"  # Greater than
  user_age: "gte:18"          # Greater than or equal
  priority: "lt:100"          # Less than
  quota_used: "lte:90"        # Less than or equal

# Pattern matching
conditions:
  resource: "regex:^database:customers:.*"
  email: "glob:*@company.com"
```

## Actions

### Action Types

| Action | Description | Use Case |
|--------|-------------|----------|
| `allow` | Grant access | Whitelist rules |
| `deny` | Block access | Blacklist rules |
| `block` | Block and log | Security violations |
| `throttle` | Slow down request | Rate limiting |
| `redact` | Remove sensitive data | PII protection |
| `audit` | Log but allow | Monitoring |
| `alert` | Allow but send alert | Suspicious activity |

### Action Configuration

```yaml
# Simple action
action: deny

# Action with parameters
action: throttle
throttle_delay: 1s

# Action with custom response
action: block
response:
  status_code: 403
  message: "Access denied: insufficient permissions"
  headers:
    X-Rate-Limit-Remaining: "0"
```

## Priority and Evaluation Order

Policies are evaluated in priority order (highest first):

1. **Priority 1000**: Critical security policies
2. **Priority 900-999**: Compliance policies
3. **Priority 500-899**: Access control
4. **Priority 100-499**: Rate limiting, quotas
5. **Priority 1-99**: Content filtering, logging

### Priority Example

```yaml
# Evaluated first (priority 1000)
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: block-suspicious-ips
spec:
  type: access-control
  priority: 1000
  rules:
    - action: block
      conditions:
        ip: "suspicious-ip-list"

---
# Evaluated second (priority 500)
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: require-authentication
spec:
  type: access-control
  priority: 500
  rules:
    - action: deny
      conditions:
        authenticated: false
```

## Variables and Templating

Use variables for dynamic values:

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: dynamic-rate-limit
spec:
  type: rate-limit
  rules:
    - limit: "{{ user.tier.rate_limit }}"
      window: 60s
      scope: user
      message: "Rate limit: {{ user.tier.rate_limit }} req/min"
```

**Available Variables:**

- `{{ user.id }}`: User ID
- `{{ user.role }}`: User role
- `{{ user.tier }}`: Pricing tier
- `{{ request.ip }}`: Request IP address
- `{{ request.time }}`: Request timestamp
- `{{ resource.type }}`: Resource type
- `{{ resource.id }}`: Resource ID

## Policy Validation

### Required Validation

Before deploying, validate policies:

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/policies/validate \
  -H "Content-Type: application/yaml" \
  --data-binary @policy.yaml
```

**Response (valid):**

```json
{
  "valid": true,
  "policy_name": "rate-limit-per-user",
  "warnings": []
}
```

**Response (invalid):**

```json
{
  "valid": false,
  "errors": [
    "spec.type: unknown policy type 'invalid-type'",
    "spec.rules[0].limit: must be a positive integer"
  ]
}
```

## Testing Policies

### Dry Run Mode

Test policies without enforcement:

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: test-policy
spec:
  type: access-control
  dry_run: true  # Log matches but don't enforce
  rules:
    - action: deny
      conditions:
        resource: "api:payments:*"
```

### Policy Simulation

Simulate policy evaluation:

```bash
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/policies/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test@company.com",
    "resource": "database:customers:read",
    "action": "read"
  }'
```

**Response:**

```json
{
  "allowed": false,
  "matched_policies": [
    {
      "name": "restrict-customer-data",
      "rule": 0,
      "action": "deny",
      "reason": "Customer data access requires admin role"
    }
  ],
  "evaluation_time_ms": 2.3
}
```

## Best Practices

1. **Use Descriptive Names**: `block-suspicious-ips` not `policy-1`
2. **Set Appropriate Priorities**: Critical security = 900-1000
3. **Add Descriptions**: Explain why the policy exists
4. **Test Before Deploy**: Use validate and simulate endpoints
5. **Version Control**: Store policies in git
6. **Use Dry Run**: Test new policies without impact
7. **Monitor Performance**: Keep policies under 10ms P95
8. **Document Variables**: Comment what variables are used
9. **Group Related Rules**: One policy per logical group
10. **Regular Reviews**: Audit policies quarterly

## Common Patterns

### Pattern 1: Role-Based Access

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: rbac-database-access
spec:
  type: access-control
  rules:
    - action: allow
      conditions:
        resource: "database:*:read"
        user_role: "or:[admin,analyst,developer]"

    - action: allow
      conditions:
        resource: "database:*:write"
        user_role: "or:[admin,developer]"

    - action: deny
      conditions:
        resource: "database:*:*"
```

### Pattern 2: Time-Based Access

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: business-hours-only
spec:
  type: access-control
  rules:
    - action: deny
      conditions:
        time_of_day: "not:09:00-17:00"
        day_of_week: "not:monday-friday"
      message: "API access limited to business hours"
```

### Pattern 3: Progressive Rate Limiting

```yaml
apiVersion: axonflow.io/v1
kind: Policy
metadata:
  name: progressive-rate-limit
spec:
  type: rate-limit
  rules:
    - limit: 100
      window: 60s
      action: throttle
      delay: 100ms

    - limit: 1000
      window: 3600s
      action: block
      message: "Hourly limit exceeded"
```

## Next Steps

- [Policy Examples](/docs/policies/examples)
- [Testing Policies](/docs/policies/testing)
- [API Reference](/docs/api/agent-endpoints)
