# SDK Authentication

Learn how to securely authenticate your applications with AxonFlow using API keys, license keys, and best practices for production deployments.

## Overview

AxonFlow uses API key authentication to identify clients and enforce governance policies. Each client receives a unique API key (also called `client_id`) that grants access to the AxonFlow platform.

## Getting Your API Key

### For SaaS Mode

1. Sign up at [getaxonflow.com](https://getaxonflow.com)
2. Navigate to **Settings > API Keys**
3. Click **Generate New API Key**
4. Copy your `client_id` and `client_secret`

### For In-VPC Mode (AWS Marketplace)

After deploying AxonFlow via AWS CloudFormation:

1. Check CloudFormation stack outputs
2. Find the `ClientID` and `ClientSecret` values
3. Store these in AWS Secrets Manager (recommended)

## Authentication Methods

### Method 1: Environment Variables (Recommended)

**TypeScript/JavaScript:**

```typescript
import { AxonFlow } from '@axonflow/sdk';

const axonflow = new AxonFlow({
  apiKey: process.env.AXONFLOW_API_KEY  // Loads from .env file
});
```

**Go:**

```go
import (
    "os"
    "github.com/getaxonflow/axonflow-go"
)

client := axonflow.NewClientSimple(
    os.Getenv("AXONFLOW_AGENT_URL"),
    os.Getenv("AXONFLOW_CLIENT_ID"),
    os.Getenv("AXONFLOW_CLIENT_SECRET"),
)
```

**Environment file (`.env`):**

```bash
# SaaS Mode (Public Endpoint)
AXONFLOW_API_KEY=your-client-id-here
AXONFLOW_ENDPOINT=https://staging-eu.getaxonflow.com

# In-VPC Mode (Private Endpoint)
AXONFLOW_API_KEY=your-client-id-here
AXONFLOW_CLIENT_SECRET=your-client-secret-here
AXONFLOW_ENDPOINT=https://10.0.2.67:8443
```

### Method 2: Direct Configuration

Only use in secure environments (server-side code):

**TypeScript:**

```typescript
const axonflow = new AxonFlow({
  apiKey: 'client-healthcare-prod-a1b2c3',
  endpoint: 'https://staging-eu.getaxonflow.com'
});
```

**Go:**

```go
client := axonflow.NewClientSimple(
    "https://staging-eu.getaxonflow.com",
    "client-healthcare-prod-a1b2c3",
    "secret-xyz123",
)
```

### Method 3: AWS Secrets Manager (Production)

For production In-VPC deployments, store credentials in AWS Secrets Manager:

**TypeScript (AWS SDK v3):**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { AxonFlow } from '@axonflow/sdk';

async function getAxonFlowClient() {
  const secretsManager = new SecretsManagerClient({ region: 'eu-central-1' });

  const response = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: 'axonflow/credentials' })
  );

  const secrets = JSON.parse(response.SecretString);

  return new AxonFlow({
    apiKey: secrets.client_id,
    endpoint: secrets.endpoint
  });
}

const axonflow = await getAxonFlowClient();
```

**Go:**

```go
import (
    "encoding/json"
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/secretsmanager"
    "github.com/getaxonflow/axonflow-go"
)

func getAxonFlowClient() (*axonflow.Client, error) {
    sess := session.Must(session.NewSession())
    svc := secretsmanager.New(sess, aws.NewConfig().WithRegion("eu-central-1"))

    result, err := svc.GetSecretValue(&secretsmanager.GetSecretValueInput{
        SecretId: aws.String("axonflow/credentials"),
    })
    if err != nil {
        return nil, err
    }

    var secrets map[string]string
    json.Unmarshal([]byte(*result.SecretString), &secrets)

    return axonflow.NewClientSimple(
        secrets["endpoint"],
        secrets["client_id"],
        secrets["client_secret"],
    ), nil
}
```

## Security Best Practices

### 1. Never Hardcode API Keys

❌ **Bad:**
```typescript
const axonflow = new AxonFlow({
  apiKey: 'client-healthcare-prod-a1b2c3'  // Hardcoded!
});
```

✅ **Good:**
```typescript
const axonflow = new AxonFlow({
  apiKey: process.env.AXONFLOW_API_KEY
});
```

### 2. Use Environment-Specific Keys

Separate keys for development, staging, and production:

```bash
# .env.development
AXONFLOW_API_KEY=client-healthcare-sandbox-dev

# .env.production
AXONFLOW_API_KEY=client-healthcare-prod-a1b2c3
```

### 3. Rotate Keys Regularly

For production environments, rotate API keys every 90 days:

1. Generate new API key in AxonFlow dashboard
2. Update environment variables/Secrets Manager
3. Deploy updated configuration
4. Revoke old API key after 24 hours

### 4. Restrict Key Permissions

In multi-tenant environments, use least-privilege keys:

```typescript
// Healthcare tenant only has access to healthcare policies
const healthcareAxonFlow = new AxonFlow({
  apiKey: process.env.HEALTHCARE_API_KEY,
  tenant: 'healthcare'
});

// E-commerce tenant has separate access
const ecommerceAxonFlow = new AxonFlow({
  apiKey: process.env.ECOMMERCE_API_KEY,
  tenant: 'ecommerce'
});
```

### 5. Never Expose Keys Client-Side

❌ **Never do this in React/Vue/Angular:**

```typescript
// THIS IS INSECURE - Don't put API keys in frontend code!
const axonflow = new AxonFlow({
  apiKey: 'client-healthcare-prod-a1b2c3'  // Exposed in browser!
});
```

✅ **Instead, use a backend proxy:**

```typescript
// Frontend - calls your backend
const response = await fetch('/api/ai-query', {
  method: 'POST',
  body: JSON.stringify({ prompt })
});

// Backend API route - has API key
import { AxonFlow } from '@axonflow/sdk';

const axonflow = new AxonFlow({
  apiKey: process.env.AXONFLOW_API_KEY  // Safe - server-side only
});

export default async function handler(req, res) {
  const { prompt } = req.body;
  const result = await axonflow.protect(/* ... */);
  res.json(result);
}
```

## License Key Validation

AxonFlow supports license-based authentication for In-VPC deployments:

### How License Keys Work

1. Customer receives license key (e.g., `AXON-PRO-12345-ABCDE-67890`)
2. License key encodes: tier (Professional/Enterprise), node limit, expiration
3. Agent validates license on startup using HMAC signature
4. Platform enforces node limits and features based on tier

### License Key Format

```
AXON-{TIER}-{RANDOM}-{TIMESTAMP}-{HMAC}

Example: AXON-PRO-12345-ABCDE-67890
  - TIER: PRO (Professional), ENT (Enterprise), PLUS (Enterprise Plus)
  - RANDOM: 5-digit random number
  - TIMESTAMP: Base36 encoded expiration date
  - HMAC: 5-character signature
```

### Activating a License Key

**In-VPC Deployment (CloudFormation):**

License key is automatically validated on deployment. No manual activation needed.

**Manual Activation (Development/Testing):**

Set the license key as an environment variable:

```bash
export AXONFLOW_LICENSE_KEY=AXON-PRO-12345-ABCDE-67890
```

Then start the Agent:

```bash
./agent --config /etc/axonflow/agent.conf
```

### Checking License Status

**Via API:**

```typescript
const axonflow = new AxonFlow({ apiKey: process.env.AXONFLOW_API_KEY });

const status = await axonflow.getLicenseStatus();

console.log('License Tier:', status.tier);        // "Professional"
console.log('Max Nodes:', status.maxNodes);       // 10
console.log('Expires:', status.expiresAt);        // "2026-10-27T00:00:00Z"
console.log('Valid:', status.valid);              // true
```

**Via Agent Health Endpoint:**

```bash
curl -s https://staging-eu.getaxonflow.com/health | jq '.license'
```

Response:
```json
{
  "valid": true,
  "tier": "Professional",
  "maxNodes": 10,
  "expiresAt": "2026-10-27T00:00:00Z"
}
```

## Multi-Tenant Authentication

For SaaS applications serving multiple tenants:

### Tenant Isolation

```typescript
import { AxonFlow } from '@axonflow/sdk';

// Initialize once per tenant
function getAxonFlowForTenant(tenantId: string) {
  return new AxonFlow({
    apiKey: process.env.AXONFLOW_API_KEY,
    tenant: tenantId  // Enforces tenant isolation
  });
}

// Usage
const tenant1Client = getAxonFlowForTenant('healthcare-corp');
const tenant2Client = getAxonFlowForTenant('ecommerce-inc');

// Each client only sees their own policies and audit logs
```

### Per-Tenant API Keys

For stricter isolation, use separate API keys:

```typescript
// Database schema
{
  tenant_id: 'healthcare-corp',
  axonflow_api_key: 'client-healthcare-a1b2',
  created_at: '2025-10-01'
}

// Retrieve from database
function getAxonFlowForTenant(tenantId: string) {
  const tenant = db.tenants.findOne({ tenant_id: tenantId });

  return new AxonFlow({
    apiKey: tenant.axonflow_api_key,
    tenant: tenantId
  });
}
```

## Common Authentication Issues

### Issue 1: 401 Unauthorized

**Cause:** Invalid or missing API key

**Solution:**
```typescript
// Check API key is set
console.log('API Key:', process.env.AXONFLOW_API_KEY?.substring(0, 10) + '...');

// Verify format: client-{name}-{env}-{hash}
if (!process.env.AXONFLOW_API_KEY?.startsWith('client-')) {
  throw new Error('Invalid API key format');
}
```

### Issue 2: 403 Forbidden

**Cause:** API key valid but lacks permissions

**Solution:**
- Check tenant ID matches your key
- Verify license tier supports requested features
- Contact support to upgrade tier if needed

### Issue 3: License Expired

**Cause:** In-VPC license key has expired

**Solution:**
1. Contact AxonFlow sales for license renewal
2. Update `AXONFLOW_LICENSE_KEY` environment variable
3. Restart Agent containers

### Issue 4: Connection Refused

**Cause:** Wrong endpoint URL

**Solution:**

For **SaaS Mode**:
```typescript
const axonflow = new AxonFlow({
  endpoint: 'https://staging-eu.getaxonflow.com'  // Correct public endpoint
});
```

For **In-VPC Mode**:
```typescript
const axonflow = new AxonFlow({
  endpoint: 'https://10.0.2.67:8443'  // VPC private endpoint (must be in same VPC)
});
```

## Testing Authentication

### Quick Test (cURL)

```bash
# Test public endpoint
curl -X POST https://staging-eu.getaxonflow.com/v1/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "prompt": "What is 2+2?",
    "mode": "chat"
  }'

# Expected: 200 OK with JSON response
```

### Integration Test

**TypeScript:**

```typescript
import { AxonFlow } from '@axonflow/sdk';

async function testAuthentication() {
  const axonflow = new AxonFlow({
    apiKey: process.env.AXONFLOW_API_KEY
  });

  try {
    // Simple health check
    const health = await axonflow.healthCheck();
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

testAuthentication();
```

**Go:**

```go
func testAuthentication() error {
    client := axonflow.NewClientSimple(
        os.Getenv("AXONFLOW_AGENT_URL"),
        os.Getenv("AXONFLOW_CLIENT_ID"),
        os.Getenv("AXONFLOW_CLIENT_SECRET"),
    )

    err := client.HealthCheck()
    if err != nil {
        return fmt.Errorf("authentication failed: %v", err)
    }

    fmt.Println("✅ Authentication successful")
    return nil
}
```

## Next Steps

- Review [TypeScript SDK Guide](./typescript-getting-started.md) for code examples
- Review [Go SDK Guide](./go-getting-started.md) for Go integration
- Learn about [AWS Marketplace Deployment](../deployment/aws-marketplace.md) for In-VPC setup
- Read [Security Best Practices](../security/best-practices.md) for production hardening

## Support

**Having authentication issues?**

- Email: support@getaxonflow.com
- Slack: [Join our community](https://join.slack.com/t/axonflow/)
- Docs: https://docs.getaxonflow.com

**Include in your support request:**
- SDK version (TypeScript/Go)
- Deployment mode (SaaS or In-VPC)
- Error message and stack trace
- API key format (first 10 characters only)
