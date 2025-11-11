# Build Your First AxonFlow Agent in 10 Minutes

**Build a production-ready AI agent with policy enforcement** - No ML experience required.

---

## What You'll Build

A simple AI agent that:
- Accepts natural language queries
- Enforces policy rules before execution
- Returns governed responses
- Logs all activity for audit compliance

**Time to complete:** 10 minutes
**Difficulty:** Beginner
**Prerequisites:** AxonFlow deployed (see [Getting Started](/docs/getting-started))

---

## Overview

This tutorial walks you through creating your first AI agent using AxonFlow. By the end, you'll have a working agent that enforces policies and logs all activity.

### What You'll Learn

- Installing the AxonFlow SDK
- Configuring your client
- Creating your first policy
- Sending queries to your agent
- Viewing audit logs

---

## Prerequisites

Before starting, ensure you have:

1. **AxonFlow Deployed**
   - Follow the [Getting Started Guide](/docs/getting-started) to deploy via AWS Marketplace
   - Retrieve your **Agent Endpoint** from CloudFormation Outputs

2. **License Key**
   - Get your license key from CloudFormation Outputs
   - Format: `AXON-V2-{base64}-{signature}`

3. **Development Environment**
   - **Node.js 18+** OR **Go 1.21+**
   - Text editor (VS Code, Sublime, etc.)
   - Terminal access

4. **AWS CLI (Optional)**
   - For viewing CloudWatch logs
   - Installation: `pip install awscli`

---

## Step 1: Install the SDK (2 minutes)

Choose your preferred language:

### TypeScript / JavaScript

```bash
# Create a new project directory
mkdir my-first-agent
cd my-first-agent

# Initialize npm project
npm init -y

# Install AxonFlow SDK
npm install @axonflow/sdk

# Install TypeScript (if using TypeScript)
npm install --save-dev typescript @types/node
npx tsc --init
```

### Go

```bash
# Create a new project directory
mkdir my-first-agent
cd my-first-agent

# Initialize Go module
go mod init my-first-agent

# Install AxonFlow SDK
go get github.com/axonflow/axonflow-go
```

---

## Step 2: Configure Your Client (2 minutes)

Create a configuration file for your AxonFlow connection.

### TypeScript

Create `index.ts`:

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

// Initialize AxonFlow client
const client = new AxonFlowClient({
  endpoint: 'https://YOUR_AGENT_ENDPOINT',
  licenseKey: 'YOUR_LICENSE_KEY',
  organizationId: 'my-org',
  insecureSkipVerify: true  // For self-signed certs in development
});

async function main() {
  try {
    // Test connection
    const health = await client.health();
    console.log('✅ Connected to AxonFlow:', health);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

main();
```

### Go

Create `main.go`:

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/axonflow/axonflow-go"
)

func main() {
	// Initialize AxonFlow client
	client, err := axonflow.NewClient(axonflow.Config{
		Endpoint:           "https://YOUR_AGENT_ENDPOINT",
		LicenseKey:         "YOUR_LICENSE_KEY",
		OrganizationID:     "my-org",
		InsecureSkipVerify: true, // For self-signed certs in development
	})
	if err != nil {
		log.Fatal("Failed to create client:", err)
	}

	ctx := context.Background()

	// Test connection
	health, err := client.Health(ctx)
	if err != nil {
		log.Fatal("Connection failed:", err)
	}

	fmt.Println("✅ Connected to AxonFlow:", health)
}
```

**Configuration Notes:**
- Replace `YOUR_AGENT_ENDPOINT` with your actual endpoint
- Replace `YOUR_LICENSE_KEY` with your license key
- `insecureSkipVerify: true` is for development only (remove in production)

**Run it:**

```bash
# TypeScript
npx ts-node index.ts

# Go
go run main.go
```

**Expected Output:**
```
✅ Connected to AxonFlow: { status: 'healthy', version: '1.0.12' }
```

---

## Step 3: Create Your First Policy (3 minutes)

Policies define what your AI agent can and cannot do. Let's create a simple policy that allows all queries but logs them for audit.

### Create Policy File

Create `policy.rego`:

```rego
package axonflow.policy

# Allow all queries by default
default allow = true

# Log decision for audit trail
log_decision {
    allow
}

# Metadata for this policy
metadata := {
    "policy_name": "my-first-policy",
    "version": "1.0.0",
    "description": "Allow all queries with audit logging"
}
```

### Understanding the Policy

- `package axonflow.policy` - Required namespace for AxonFlow policies
- `default allow = true` - Allow all queries (permissive policy)
- `log_decision` - Ensures all decisions are logged
- `metadata` - Describes the policy (for documentation)

**Policy Language:** AxonFlow uses [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) Rego syntax.

---

## Step 4: Send Your First Query (2 minutes)

Now let's send a query to your agent with policy enforcement.

### TypeScript

Update `index.ts`:

```typescript
import { AxonFlowClient } from '@axonflow/sdk';
import * as fs from 'fs';

const client = new AxonFlowClient({
  endpoint: 'https://YOUR_AGENT_ENDPOINT',
  licenseKey: 'YOUR_LICENSE_KEY',
  organizationId: 'my-org',
  insecureSkipVerify: true
});

async function main() {
  try {
    // Load policy
    const policy = fs.readFileSync('policy.rego', 'utf-8');

    // Send query with policy enforcement
    const response = await client.executeQuery({
      query: 'What is the capital of France?',
      policy: policy,
      context: {
        user_id: 'user-123',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Query Response:', response);
    console.log('📊 Policy Decision:', response.metadata.policy_decision);
    console.log('⏱️  Latency:', response.metadata.latency_ms + 'ms');
  } catch (error) {
    console.error('❌ Query failed:', error);
  }
}

main();
```

### Go

Update `main.go`:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/axonflow/axonflow-go"
)

func main() {
	client, err := axonflow.NewClient(axonflow.Config{
		Endpoint:           "https://YOUR_AGENT_ENDPOINT",
		LicenseKey:         "YOUR_LICENSE_KEY",
		OrganizationID:     "my-org",
		InsecureSkipVerify: true,
	})
	if err != nil {
		log.Fatal("Failed to create client:", err)
	}

	ctx := context.Background()

	// Load policy
	policy, err := os.ReadFile("policy.rego")
	if err != nil {
		log.Fatal("Failed to read policy:", err)
	}

	// Send query with policy enforcement
	response, err := client.ExecuteQuery(ctx, &axonflow.QueryRequest{
		Query:  "What is the capital of France?",
		Policy: string(policy),
		Context: map[string]interface{}{
			"user_id":   "user-123",
			"timestamp": time.Now().Format(time.RFC3339),
		},
	})
	if err != nil {
		log.Fatal("Query failed:", err)
	}

	fmt.Println("✅ Query Response:", response.Result)
	fmt.Printf("📊 Policy Decision: %v\n", response.Metadata.PolicyDecision)
	fmt.Printf("⏱️  Latency: %dms\n", response.Metadata.LatencyMS)
}
```

### Run Your Agent

```bash
# TypeScript
npx ts-node index.ts

# Go
go run main.go
```

### Expected Output

```
✅ Query Response: The capital of France is Paris.
📊 Policy Decision: allow
⏱️  Latency: 4ms
```

**What Just Happened?**

1. **Query sent** - "What is the capital of France?"
2. **Policy evaluated** - AxonFlow checked your policy (sub-10ms!)
3. **Query allowed** - Policy returned `allow = true`
4. **Response returned** - Agent processed and returned result
5. **Audit logged** - All activity recorded in CloudWatch

---

## Step 5: View Audit Logs (1 minute)

All queries are automatically logged to AWS CloudWatch for compliance and debugging.

### View Logs in AWS Console

1. Go to **AWS CloudWatch Console**
2. Click **Log Groups**
3. Find `/ecs/YOUR-STACK-NAME/agent`
4. Click on the latest log stream
5. Search for your query

### View Logs via AWS CLI

```bash
aws logs tail /ecs/YOUR-STACK-NAME/agent --follow --region YOUR-REGION
```

### Expected Log Entry

```json
{
  "timestamp": "2025-11-11T12:00:00Z",
  "level": "info",
  "message": "Query executed",
  "query": "What is the capital of France?",
  "policy_decision": "allow",
  "latency_ms": 4,
  "user_id": "user-123",
  "organization_id": "my-org"
}
```

---

## Congratulations! 🎉

You've successfully built your first AxonFlow agent! Here's what you accomplished:

- ✅ Installed the AxonFlow SDK
- ✅ Configured your client connection
- ✅ Created a policy for governance
- ✅ Sent a query with policy enforcement
- ✅ Viewed audit logs

### What You Learned

- **Sub-10ms Policy Enforcement** - Your policy was evaluated in ~4ms
- **Automatic Audit Logging** - All activity is logged for compliance
- **Policy-as-Code** - Governance rules are versioned and testable
- **Production-Ready** - This agent can handle production traffic

---

## Next Steps

Now that you have a working agent, explore these advanced topics:

### 1. Add LLM Integration

Connect your agent to AWS Bedrock, OpenAI, or Anthropic Claude:

```typescript
const response = await client.executeQuery({
  query: 'Generate a product description for wireless headphones',
  policy: policy,
  llm: {
    provider: 'aws-bedrock',
    model: 'anthropic.claude-3-sonnet-20240229-v1:0'
  }
});
```

📖 **Learn more:** [LLM Integration Guide](/docs/tutorials/llm-integration)

### 2. Connect to Your Database

Query your Snowflake, PostgreSQL, or Salesforce data with permission checks:

```typescript
const response = await client.executeQuery({
  query: 'Get customer data for user 12345',
  policy: policy,
  mcp: {
    connector: 'snowflake',
    operation: 'query'
  }
});
```

📖 **Learn more:** [Database Integration Guide](/docs/tutorials/database-integration)

### 3. Implement Multi-Agent Parallel Execution (MAP)

Run multiple agents in parallel for 40x faster execution:

```typescript
const response = await client.executeParallel([
  { query: 'Search flights to Paris', connector: 'amadeus' },
  { query: 'Search hotels in Paris', connector: 'amadeus' },
  { query: 'Get weather forecast for Paris', connector: 'weather' }
]);
```

📖 **Learn more:** [Workflow Examples](/docs/tutorials/workflow-examples)

### 4. Deploy to Production

Learn best practices for production deployments:

```bash
# Multi-AZ setup
# Auto-scaling configuration
# Monitoring and alerting
# Backup and disaster recovery
```

📖 **Learn more:** [AWS Deployment Guide](/docs/tutorials/aws-deployment)

---

## Troubleshooting

### Connection Failed

**Error:** `ECONNREFUSED` or `Connection timeout`

**Solutions:**
1. Verify your Agent Endpoint is correct (check CloudFormation Outputs)
2. Ensure your security groups allow inbound HTTPS (port 443)
3. Check that AxonFlow ECS tasks are running (AWS ECS Console)
4. Verify VPC networking (NAT Gateway, route tables)

### Invalid License Key

**Error:** `License key validation failed`

**Solutions:**
1. Verify license key format: `AXON-V2-{base64}-{signature}`
2. Check license key hasn't expired
3. Ensure organization ID matches the licensed tenant
4. Regenerate license key if needed

### Policy Syntax Error

**Error:** `Policy compilation failed`

**Solutions:**
1. Verify policy file is valid Rego syntax
2. Check required package: `package axonflow.policy`
3. Test policy locally: `opa test policy.rego`
4. Review policy examples: [Policy Syntax Guide](/docs/policies/syntax)

### Slow Response Time

**Expected:** Sub-10ms P95 latency for policy evaluation

**If slower:**
1. Check CloudWatch metrics for agent CPU/memory
2. Verify database connection (RDS Multi-AZ)
3. Check network latency (VPC peering, ALB)
4. Review policy complexity (optimize Rego rules)

---

## Additional Resources

### Documentation
- [Getting Started Guide](/docs/getting-started) - Deploy AxonFlow
- [SDK Reference (TypeScript)](/docs/sdk/typescript-getting-started) - Complete SDK docs
- [SDK Reference (Go)](/docs/sdk/go-getting-started) - Complete SDK docs
- [Policy Syntax](/docs/policies/syntax) - Policy language reference
- [API Reference](/docs/api/agent-endpoints) - REST API documentation

### Examples
- [Healthcare AI Assistant](/docs/examples/healthcare) - HIPAA-compliant example
- [E-commerce Recommendations](/docs/examples/ecommerce) - Product recommendations
- [Customer Support Chatbot](/docs/examples/support) - Support automation
- [Trip Planner](/docs/examples/trip-planner) - Multi-agent travel planning

### Support
- **Email:** support@getaxonflow.com
- **Documentation:** https://docs.getaxonflow.com
- **GitHub Issues:** https://github.com/axonflow/axonflow-sdk-typescript/issues

---

## Appendix: Complete Code Examples

### TypeScript Complete Example

```typescript
// index.ts
import { AxonFlowClient } from '@axonflow/sdk';
import * as fs from 'fs';

const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT || 'https://YOUR_AGENT_ENDPOINT',
  licenseKey: process.env.AXONFLOW_LICENSE_KEY || 'YOUR_LICENSE_KEY',
  organizationId: process.env.AXONFLOW_ORG_ID || 'my-org',
  insecureSkipVerify: process.env.NODE_ENV !== 'production'
});

async function main() {
  try {
    // Test connection
    console.log('🔌 Connecting to AxonFlow...');
    const health = await client.health();
    console.log('✅ Connected:', health);

    // Load policy
    const policy = fs.readFileSync('policy.rego', 'utf-8');

    // Execute query
    console.log('\n📤 Sending query...');
    const response = await client.executeQuery({
      query: 'What is the capital of France?',
      policy: policy,
      context: {
        user_id: 'user-123',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });

    // Display results
    console.log('\n✅ Query Response:', response.result);
    console.log('📊 Policy Decision:', response.metadata.policy_decision);
    console.log('⏱️  Latency:', response.metadata.latency_ms + 'ms');
    console.log('🆔 Request ID:', response.metadata.request_id);

    // Display audit info
    console.log('\n📋 Audit Information:');
    console.log('  - Organization:', response.metadata.organization_id);
    console.log('  - User:', response.metadata.context.user_id);
    console.log('  - Timestamp:', response.metadata.context.timestamp);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
```

### Go Complete Example

```go
// main.go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/axonflow/axonflow-go"
)

func main() {
	// Load configuration from environment
	endpoint := getEnv("AXONFLOW_ENDPOINT", "https://YOUR_AGENT_ENDPOINT")
	licenseKey := getEnv("AXONFLOW_LICENSE_KEY", "YOUR_LICENSE_KEY")
	orgID := getEnv("AXONFLOW_ORG_ID", "my-org")
	env := getEnv("ENVIRONMENT", "development")

	// Initialize client
	client, err := axonflow.NewClient(axonflow.Config{
		Endpoint:           endpoint,
		LicenseKey:         licenseKey,
		OrganizationID:     orgID,
		InsecureSkipVerify: env != "production",
	})
	if err != nil {
		log.Fatal("Failed to create client:", err)
	}

	ctx := context.Background()

	// Test connection
	fmt.Println("🔌 Connecting to AxonFlow...")
	health, err := client.Health(ctx)
	if err != nil {
		log.Fatal("Connection failed:", err)
	}
	fmt.Println("✅ Connected:", health)

	// Load policy
	policy, err := os.ReadFile("policy.rego")
	if err != nil {
		log.Fatal("Failed to read policy:", err)
	}

	// Execute query
	fmt.Println("\n📤 Sending query...")
	response, err := client.ExecuteQuery(ctx, &axonflow.QueryRequest{
		Query:  "What is the capital of France?",
		Policy: string(policy),
		Context: map[string]interface{}{
			"user_id":     "user-123",
			"timestamp":   time.Now().Format(time.RFC3339),
			"environment": env,
		},
	})
	if err != nil {
		log.Fatal("Query failed:", err)
	}

	// Display results
	fmt.Println("\n✅ Query Response:", response.Result)
	fmt.Printf("📊 Policy Decision: %v\n", response.Metadata.PolicyDecision)
	fmt.Printf("⏱️  Latency: %dms\n", response.Metadata.LatencyMS)
	fmt.Printf("🆔 Request ID: %s\n", response.Metadata.RequestID)

	// Display audit info
	fmt.Println("\n📋 Audit Information:")
	fmt.Printf("  - Organization: %s\n", response.Metadata.OrganizationID)
	fmt.Printf("  - User: %v\n", response.Metadata.Context["user_id"])
	fmt.Printf("  - Timestamp: %v\n", response.Metadata.Context["timestamp"])
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
```

### Environment Variables

Create `.env`:

```bash
AXONFLOW_ENDPOINT=https://your-agent-endpoint
AXONFLOW_LICENSE_KEY=AXON-V2-xxx-yyy
AXONFLOW_ORG_ID=my-org
ENVIRONMENT=development
```

**Security Note:** Never commit `.env` to git. Add to `.gitignore`.

---

**Tutorial Complete!** You now have a production-ready AxonFlow agent. 🚀
