# TypeScript SDK - Getting Started

Add invisible AI governance to your TypeScript/JavaScript applications in 3 lines of code. No UI changes. No user training. Just drop-in enterprise protection.

## Installation

```bash
npm install @axonflow/sdk
```

Or with yarn:

```bash
yarn add @axonflow/sdk
```

Or with pnpm:

```bash
pnpm add @axonflow/sdk
```

## Quick Start

### Basic Usage

The simplest way to add AxonFlow governance is to wrap your AI calls with `protect()`:

```typescript
import { AxonFlow } from '@axonflow/sdk';
import OpenAI from 'openai';

// Initialize your AI client as usual
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Add AxonFlow governance (3 lines)
const axonflow = new AxonFlow({ licenseKey: process.env.AXONFLOW_LICENSE_KEY });

// Wrap any AI call with protect()
const response = await axonflow.protect(async () => {
  return openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Process this customer data...' }]
  });
});
```

### Even Easier: Client Wrapping

For maximum convenience, wrap your entire AI client. All calls automatically become protected:

```typescript
import { AxonFlow, wrapOpenAIClient } from '@axonflow/sdk';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const axonflow = new AxonFlow({ licenseKey: process.env.AXONFLOW_LICENSE_KEY });

// Wrap the entire client - all calls are now protected
const protectedOpenAI = wrapOpenAIClient(openai, axonflow);

// Use normally - governance happens invisibly
const response = await protectedOpenAI.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Process this customer data...' }]
});
```

## Framework Integration

### React

```tsx
import { AxonFlow } from '@axonflow/sdk';
import { useState } from 'react';

const axonflow = new AxonFlow({ licenseKey: process.env.NEXT_PUBLIC_AXONFLOW_LICENSE_KEY });

function ChatComponent() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (prompt: string) => {
    setLoading(true);

    try {
      // Your existing OpenAI call, now protected
      const result = await axonflow.protect(async () => {
        return fetch('/api/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        }).then(r => r.json());
      });

      setResponse(result.text);
    } catch (error) {
      console.error('Request blocked:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your existing UI - no changes needed
    <div>
      <textarea onChange={(e) => handleSubmit(e.target.value)} />
      {loading && <p>Loading...</p>}
      {response && <p>{response}</p>}
    </div>
  );
}
```

### Next.js API Route

```typescript
// pages/api/chat.ts
import { AxonFlow } from '@axonflow/sdk';
import OpenAI from 'openai';
import type { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const axonflow = new AxonFlow({ licenseKey: process.env.AXONFLOW_LICENSE_KEY });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { prompt } = req.body;

  try {
    // Protect the OpenAI call
    const response = await axonflow.protect(async () => {
      return openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });
    });

    res.status(200).json({ success: true, response });
  } catch (error) {
    // AxonFlow will block requests that violate policies
    res.status(403).json({ error: error.message });
  }
}
```

### Express.js

```typescript
import express from 'express';
import { AxonFlow } from '@axonflow/sdk';
import OpenAI from 'openai';

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const axonflow = new AxonFlow({ licenseKey: process.env.AXONFLOW_LICENSE_KEY });

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axonflow.protect(async () => {
      return openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      });
    });

    res.json({ success: true, response });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

app.listen(3000);
```

## Configuration

### Basic Configuration

```typescript
const axonflow = new AxonFlow({
  licenseKey: 'your-license-key',    // Required (License Key from AxonFlow)
  mode: 'production',                // or 'sandbox' for testing
  endpoint: 'https://staging-eu.getaxonflow.com', // Default public endpoint
  tenant: 'your-tenant-id',          // For multi-tenant setups
  debug: false,                      // Enable debug logging
});
```

### Advanced Configuration

```typescript
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  mode: 'production',
  endpoint: 'https://staging-eu.getaxonflow.com',

  // Retry configuration
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000  // milliseconds
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: 60000  // 1 minute in milliseconds
  },

  // Debug mode
  debug: process.env.NODE_ENV === 'development',
});
```

### VPC Private Endpoint (Low-Latency)

For customers running within AWS VPC, use the private endpoint for sub-10ms latency:

```typescript
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  endpoint: 'https://YOUR_VPC_IP:8443',  // VPC private endpoint (replace YOUR_VPC_IP with your internal IP)
  tenant: process.env.AXONFLOW_TENANT,
  mode: 'production'
});
```

**Performance Comparison:**
- **Public endpoint**: ~100ms (internet routing)
- **VPC private endpoint**: &lt;10ms P99 (intra-VPC routing)

**Note:** VPC endpoints require AWS VPC peering setup with AxonFlow infrastructure. Contact sales for setup.

### Sandbox Mode

For testing without affecting production:

```typescript
// Use sandbox mode for testing
const axonflow = AxonFlow.sandbox('demo-key');

// Test with aggressive policies
const response = await axonflow.protect(async () => {
  return openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: 'My SSN is 123-45-6789' // Will be blocked/redacted in sandbox
    }]
  });
});
```

## What Gets Protected?

AxonFlow automatically:
- **Blocks** prompts containing sensitive data (PII, credentials, financial data)
- **Redacts** personal information from responses
- **Enforces** rate limits and usage quotas per tenant
- **Prevents** prompt injection and jailbreak attempts
- **Logs** all requests for compliance audit trails
- **Monitors** costs and usage patterns in real-time

## Error Handling

```typescript
try {
  const response = await axonflow.protect(() =>
    openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    })
  );

  console.log('Success:', response);
} catch (error) {
  if (error.message.includes('blocked by AxonFlow')) {
    // Request violated a policy
    console.log('Policy violation:', error.message);
    // Show user-friendly error message
  } else if (error.message.includes('rate limit')) {
    // Rate limit exceeded
    console.log('Rate limit exceeded, try again later');
  } else {
    // Other errors (network, API, etc.)
    console.error('API error:', error);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { AxonFlow, AxonFlowResponse, AxonFlowError } from '@axonflow/sdk';

// Full type safety
const axonflow = new AxonFlow({
  licenseKey: string,
  mode?: 'production' | 'sandbox',
  endpoint?: string,
  tenant?: string,
  debug?: boolean,
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  },
  cache?: {
    enabled: boolean;
    ttl: number;
  }
});

// Response types
const response: AxonFlowResponse = await axonflow.protect(/* ... */);
```

## MCP Connector Integration

Connect to external data sources using Model Context Protocol (MCP) connectors:

### List Available Connectors

```typescript
const connectors = await axonflow.listConnectors();

connectors.forEach(conn => {
  console.log(`Connector: ${conn.name} (${conn.type})`);
  console.log(`  Description: ${conn.description}`);
  console.log(`  Installed: ${conn.installed}`);
  console.log(`  Capabilities: ${conn.capabilities.join(', ')}`);
});
```

### Install a Connector

```typescript
await axonflow.installConnector({
  connector_id: 'amadeus-travel',
  name: 'amadeus-prod',
  tenant_id: 'your-tenant-id',
  options: {
    environment: 'production'
  },
  credentials: {
    api_key: process.env.AMADEUS_API_KEY,
    api_secret: process.env.AMADEUS_API_SECRET
  }
});

console.log('Amadeus connector installed successfully!');
```

### Query a Connector

```typescript
// Query the Amadeus connector for flight information
const resp = await axonflow.queryConnector(
  'amadeus-prod',
  'Find flights from Paris to Amsterdam on Dec 15',
  {
    origin: 'CDG',
    destination: 'AMS',
    date: '2025-12-15'
  }
);

if (resp.success) {
  console.log('Flight data:', resp.data);
  // resp.data contains real Amadeus GDS flight offers
} else {
  console.error('Query failed:', resp.error);
}
```

## Multi-Agent Planning (MAP)

Generate and execute complex multi-step plans using AI agent orchestration:

### Generate a Plan

```typescript
// Generate a travel planning workflow
const plan = await axonflow.generatePlan(
  'Plan a 3-day trip to Paris with moderate budget',
  'travel'  // Domain hint (optional)
);

console.log(`Generated plan ${plan.planId} with ${plan.steps.length} steps`);
console.log(`Complexity: ${plan.complexity}, Parallel: ${plan.parallel}`);

plan.steps.forEach((step, i) => {
  console.log(`  Step ${i + 1}: ${step.name} (${step.type})`);
  console.log(`    Description: ${step.description}`);
  console.log(`    Agent: ${step.agent}`);
  if (step.dependsOn.length > 0) {
    console.log(`    Depends on: ${step.dependsOn.join(', ')}`);
  }
});
```

### Execute a Plan

```typescript
// Execute the generated plan
const execResp = await axonflow.executePlan(plan.planId);

console.log(`Plan Status: ${execResp.status}`);
console.log(`Duration: ${execResp.duration}`);

if (execResp.status === 'completed') {
  console.log(`Result:\n${execResp.result}`);

  // Access individual step results
  Object.entries(execResp.stepResults || {}).forEach(([stepId, result]) => {
    console.log(`  ${stepId}:`, result);
  });
} else if (execResp.status === 'failed') {
  console.error(`Error: ${execResp.error}`);
}
```

### Complete Example: Trip Planning

```typescript
import { AxonFlow } from '@axonflow/sdk';

async function planTrip() {
  const axonflow = new AxonFlow({
    licenseKey: process.env.AXONFLOW_LICENSE_KEY,
    debug: true
  });

  // 1. Generate multi-agent plan
  const plan = await axonflow.generatePlan(
    'Plan a 3-day trip to Paris for 2 people with moderate budget',
    'travel'
  );

  console.log(`✅ Generated plan with ${plan.steps.length} steps (parallel: ${plan.parallel})`);

  // 2. Execute the plan
  console.log('\n🚀 Executing plan...');
  const execResp = await axonflow.executePlan(plan.planId);

  // 3. Display results
  if (execResp.status === 'completed') {
    console.log(`\n✅ Plan completed in ${execResp.duration}`);
    console.log(`\n📋 Complete Itinerary:\n${execResp.result}`);
  } else {
    console.error(`\n❌ Plan failed: ${execResp.error}`);
  }
}

planTrip().catch(console.error);
```

## Production Best Practices

### 1. Environment Variables

Never hardcode API keys:

```typescript
// ✅ Good
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY
});

// ❌ Bad
const axonflow = new AxonFlow({
  licenseKey: 'hardcoded-key-123'  // Never do this!
});
```

### 2. Fail-Open Strategy

In production, AxonFlow fails open if unreachable. This ensures your app stays operational:

```typescript
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  mode: 'production'  // Fail-open in production
});

// If AxonFlow is down, the original call proceeds with a warning
```

### 3. Tenant Isolation

For multi-tenant applications, use tenant IDs:

```typescript
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  tenant: getCurrentTenantId()  // Dynamic tenant isolation
});
```

### 4. Enable Caching

Reduce latency for repeated queries:

```typescript
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  cache: {
    enabled: true,
    ttl: 60000  // 1 minute
  }
});
```

### 5. Enable Retry Logic

Handle transient failures automatically:

```typescript
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000
  }
});
```

## Performance Optimization

### Connection Pooling

The SDK automatically reuses HTTP connections. For high-throughput applications:

```typescript
// Create once, reuse everywhere
const axonflow = new AxonFlow({
  licenseKey: process.env.AXONFLOW_LICENSE_KEY,
  endpoint: 'https://staging-eu.getaxonflow.com'
});

// Export and import in other modules
export { axonflow };
```

### Latency Benchmarks

**Public Endpoint (Internet):**
- P50: ~80ms
- P95: ~120ms
- P99: ~150ms

**VPC Private Endpoint (AWS):**
- P50: 3ms
- P95: 6ms
- P99: 9ms

## Examples

Full working examples are available in the [GitHub repository](https://github.com/getaxonflow/axonflow-sdk-typescript/tree/main/examples):

- **Basic Usage**: Simple governance wrapper
- **Next.js Integration**: Full Next.js app with API routes
- **React Hooks**: Custom React hooks for AxonFlow
- **MCP Connectors**: Working with external data sources
- **Multi-Agent Planning**: Complex workflow orchestration

## Support & Resources

- **Documentation**: https://docs.getaxonflow.com
- **npm Package**: https://www.npmjs.com/package/@axonflow/sdk
- **GitHub**: https://github.com/getaxonflow/axonflow-sdk-typescript
- **Email**: dev@getaxonflow.com
- **Slack Community**: [Join our Slack](https://join.slack.com/t/axonflow/shared_invite/)

## Next Steps

- Read the [Authentication Guide](./authentication.md) for security best practices
- Learn about [MCP Connectors](../connectors/amadeus.md) for external data integration
- Explore [Multi-Agent Planning](../architecture/multi-agent-planning.md) for complex workflows
- Check out the [Go SDK](./go-getting-started.md) for Go applications

## License

MIT - See [LICENSE](https://github.com/getaxonflow/axonflow-sdk-typescript/blob/main/LICENSE)
