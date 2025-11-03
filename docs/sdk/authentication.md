# SDK Authentication

Learn how to securely authenticate your applications with AxonFlow using license keys and best practices for production deployments.

## Overview

**As of November 2025, AxonFlow uses License Key authentication for all deployments.** Each organization receives a cryptographically signed license key that grants access to the AxonFlow platform and enforces tier-based limits.

**License Key Format:** `AXON-{TIER}-{ID}-{TIMESTAMP}-{HMAC}`
**Example:** `AXON-PRO-12345-ABCDE-67890`

> **Note:** The legacy ClientID/ClientSecret authentication method is deprecated as of October 2025. See [Legacy Authentication](#legacy-authentication-deprecated) section for migration guidance.

## Getting Your License Key

### For AWS Marketplace Deployments (In-VPC)

After deploying AxonFlow via AWS CloudFormation:

1. License key is automatically generated during deployment
2. Find it in AWS Secrets Manager at: `axonflow/customers/{your-org-id}/license-key`
3. Or check CloudFormation stack outputs for `LicenseKey`

**Retrieve via AWS CLI:**
```bash
aws secretsmanager get-secret-value \
  --secret-id axonflow/customers/your-org-id/license-key \
  --region eu-central-1 \
  --query 'SecretString' \
  --output text
```

### For Direct Purchases

Contact AxonFlow sales to receive your organization's license key:
- **Email:** sales@getaxonflow.com
- **Subject:** "License Key Request - [Your Organization]"
- **Response Time:** 1 business day

You'll receive a license key via secure channel (encrypted email or AWS Secrets Manager).

## Using License Keys

### Method 1: Environment Variables (Recommended)

**TypeScript/JavaScript (SDK v1.1.0+):**

```typescript
import { AxonFlow } from '@axonflow/sdk';

const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  endpoint: process.env.AXONFLOW_ENDPOINT
});
```

**Go (SDK v1.2.0+):**

```go
import (
    "os"
    "github.com/getaxonflow/axonflow-go"
)

client, err := axonflow.NewClient(axonflow.ClientConfig{
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
})
```

**Environment file (`.env`):**

```bash
# License Key Authentication (Current Method)
AXONFLOW_LICENSE_KEY=AXON-PRO-12345-ABCDE-67890
AXONFLOW_ENDPOINT=https://YOUR_VPC_IP:8443

# Or for central deployments
AXONFLOW_LICENSE_KEY=AXON-ENT-67890-FGHIJ-KLMNO
AXONFLOW_AGENT_URL=https://staging-eu.getaxonflow.com
```

### Method 2: AWS Secrets Manager (Production Recommended)

For production In-VPC deployments, store credentials in AWS Secrets Manager:

**TypeScript (AWS SDK v3):**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { AxonFlow } from '@axonflow/sdk';

async function getAxonFlowClient() {
  const secretsManager = new SecretsManagerClient({ region: 'eu-central-1' });

  const response = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: 'axonflow/customers/your-org-id/license-key'
    })
  );

  const licenseKey = response.SecretString;

  return new AxonFlow({
    licenseKey: licenseKey,
    endpoint: 'https://YOUR_VPC_IP:8443'
  });
}

const axonflow = await getAxonFlowClient();
```

**Go:**

```go
import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/secretsmanager"
    "github.com/getaxonflow/axonflow-go"
)

func getAxonFlowClient() (*axonflow.Client, error) {
    sess := session.Must(session.NewSession())
    svc := secretsmanager.New(sess, aws.NewConfig().WithRegion("eu-central-1"))

    result, err := svc.GetSecretValue(&secretsmanager.GetSecretValueInput{
        SecretId: aws.String("axonflow/customers/your-org-id/license-key"),
    })
    if err != nil {
        return nil, err
    }

    licenseKey := *result.SecretString

    return axonflow.NewClient(axonflow.ClientConfig{
        LicenseKey: licenseKey,
        AgentURL:   "https://YOUR_VPC_IP:8443",
    })
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
  endpoint: 'https://YOUR_VPC_IP:8443'  // VPC private endpoint (replace YOUR_VPC_IP with your internal IP)
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

## Legacy Authentication (Deprecated)

> **Warning:** The ClientID/ClientSecret authentication method was deprecated in October 2025 and will be removed in a future release. All new deployments should use License Keys.

### What Changed

- **Old Method:** ClientID + ClientSecret (2-step auth)
- **New Method:** License Key (single key auth)
- **Reason for Change:** Simplified authentication, better security, license enforcement

### Backward Compatibility

AxonFlow SDKs currently support both authentication methods for backward compatibility:

**Legacy Code (Still Works):**

```typescript
// TypeScript - Old method (deprecated)
const axonflow = new AxonFlow({
  apiKey: 'client-healthcare-prod-a1b2c3',  // clientID
  clientSecret: 'secret-xyz123'              // clientSecret
});
```

```go
// Go - Old method (deprecated)
client := axonflow.NewClientSimple(
    "https://staging-eu.getaxonflow.com",
    "client-healthcare-prod-a1b2c3",  // clientID
    "secret-xyz123",                  // clientSecret
)
```

**This backward compatibility will be maintained until June 2026** to give customers time to migrate.

### Migrating to License Keys

Follow these steps to migrate your application:

**Step 1: Obtain Your License Key**

Contact AxonFlow support to receive your organization's license key:
- Email: support@getaxonflow.com
- Subject: "License Key Migration Request - [Your Organization]"
- Include: Current ClientID for verification

**Step 2: Update Environment Variables**

Replace your old credentials in `.env`:

```bash
# OLD (Remove these)
AXONFLOW_CLIENT_ID=client-healthcare-prod-a1b2c3
AXONFLOW_CLIENT_SECRET=secret-xyz123

# NEW (Add this)
AXONFLOW_LICENSE_KEY=AXON-PRO-12345-ABCDE-67890
```

**Step 3: Update Code**

**TypeScript Migration:**

```typescript
// BEFORE (Old method)
import { AxonFlow } from '@axonflow/sdk';

const axonflow = new AxonFlow({
  apiKey: process.env.AXONFLOW_CLIENT_ID,
  clientSecret: process.env.AXONFLOW_CLIENT_SECRET
});

// AFTER (New method)
import { AxonFlow } from '@axonflow/sdk';

const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY
});
```

**Go Migration:**

```go
// BEFORE (Old method)
import "github.com/getaxonflow/axonflow-go"

client := axonflow.NewClientSimple(
    os.Getenv("AXONFLOW_AGENT_URL"),
    os.Getenv("AXONFLOW_CLIENT_ID"),
    os.Getenv("AXONFLOW_CLIENT_SECRET"),
)

// AFTER (New method)
import "github.com/getaxonflow/axonflow-go"

client, err := axonflow.NewClient(axonflow.ClientConfig{
    LicenseKey: os.Getenv("AXONFLOW_LICENSE_KEY"),
    AgentURL:   os.Getenv("AXONFLOW_AGENT_URL"),
})
```

**Step 4: Test Migration**

Run your application with the new license key:

```bash
# Set new environment variable
export AXONFLOW_LICENSE_KEY=AXON-PRO-12345-ABCDE-67890

# Remove old variables
unset AXONFLOW_CLIENT_ID
unset AXONFLOW_CLIENT_SECRET

# Run your app
npm start  # or go run main.go
```

**Step 5: Verify**

Confirm authentication works with license key:

```bash
curl -X POST https://YOUR_ENDPOINT/health \
  -H "X-License-Key: AXON-PRO-12345-ABCDE-67890"

# Expected: {"status":"healthy","license":{"valid":true,...}}
```

### Migration Checklist

- [ ] Contact support to receive license key
- [ ] Update environment variables (remove CLIENT_ID/SECRET, add LICENSE_KEY)
- [ ] Update SDK initialization code
- [ ] Test in development environment
- [ ] Deploy to staging and verify
- [ ] Deploy to production
- [ ] Remove old environment variables from secrets manager
- [ ] Update documentation and runbooks

### Common Migration Issues

**Issue: "Invalid license key"**
- **Cause:** License key format incorrect or expired
- **Solution:** Verify key format matches `AXON-{TIER}-{ID}-{TIMESTAMP}-{HMAC}`, contact support if expired

**Issue: "License validation failed"**
- **Cause:** HMAC signature verification failed
- **Solution:** Ensure license key is copied exactly (no extra spaces or newlines)

**Issue: "Feature not available in tier"**
- **Cause:** License tier (PRO/ENT/PLUS) doesn't support requested feature
- **Solution:** Upgrade license tier or use available features

### Need Help Migrating?

Contact our migration support team:
- **Email:** migration-support@getaxonflow.com
- **Slack:** #license-migration (priority support)
- **Response Time:** < 4 hours during business hours

We can help with:
- License key generation
- Code migration assistance
- Testing and verification
- Rollback procedures if needed

---

## Next Steps

- Review [TypeScript SDK Guide](./typescript-getting-started.md) for code examples
- Review [Go SDK Guide](./go-getting-started.md) for Go integration
- Learn about [AWS Marketplace Deployment](../deployment/aws-marketplace.md) for In-VPC setup
- Read [Node Management Guide](../node-management.md) for license compliance

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
