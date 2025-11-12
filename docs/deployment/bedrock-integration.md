# AWS Bedrock Integration Guide

## Overview

**AWS Bedrock** provides serverless access to foundation models from leading AI providers through a unified API. AxonFlow integrates seamlessly with Bedrock, enabling enterprises to leverage multiple LLM providers without managing infrastructure.

**Key Benefits:**
- **Multi-Model Access:** Claude 3.5 Sonnet, Llama 3, Mistral, and more
- **Serverless:** No model hosting infrastructure required
- **AWS Native:** IAM-based security, CloudWatch monitoring, VPC endpoints
- **Cost Effective:** Pay-per-token pricing with no minimum commitments
- **Compliance:** AWS compliance certifications (HIPAA, SOC 2, GDPR)

**AxonFlow + Bedrock Architecture:**
```
User Request
  ↓
AxonFlow Agent (Governance + Policy Enforcement)
  ↓
AWS Bedrock API (Model Routing)
  ↓
Foundation Models (Claude, Llama, Mistral, etc.)
```

---

## Supported Models

### Anthropic Claude Models (Recommended)

| Model | Model ID | Use Case | Cost (Per 1M Tokens) |
|-------|----------|----------|---------------------|
| **Claude 3.5 Sonnet** | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Complex reasoning, code generation | Input: $3.00<br>Output: $15.00 |
| **Claude 3 Haiku** | `anthropic.claude-3-haiku-20240307-v1:0` | Fast responses, high throughput | Input: $0.25<br>Output: $1.25 |
| **Claude 3 Opus** | `anthropic.claude-3-opus-20240229-v1:0` | Highest accuracy, complex tasks | Input: $15.00<br>Output: $75.00 |

**Recommendation:** Start with Claude 3.5 Sonnet for balanced performance/cost, switch to Haiku for high-volume use cases.

### Meta Llama Models

| Model | Model ID | Use Case | Cost (Per 1M Tokens) |
|-------|----------|----------|---------------------|
| **Llama 3 70B** | `meta.llama3-70b-instruct-v1:0` | Open-source alternative, coding | Input: $0.99<br>Output: $0.99 |
| **Llama 3 8B** | `meta.llama3-8b-instruct-v1:0` | Budget-friendly, simple tasks | Input: $0.30<br>Output: $0.30 |

**Recommendation:** Llama 3 70B for cost-sensitive deployments where Claude's advanced reasoning isn't required.

### Mistral AI Models

| Model | Model ID | Use Case | Cost (Per 1M Tokens) |
|-------|----------|----------|---------------------|
| **Mistral Large** | `mistral.mistral-large-2402-v1:0` | European compliance, multilingual | Input: $8.00<br>Output: $24.00 |
| **Mixtral 8x7B** | `mistral.mixtral-8x7b-instruct-v0:1` | Efficient mixture-of-experts | Input: $0.45<br>Output: $0.70 |

**Recommendation:** Mistral for EU data residency requirements or multilingual use cases.

---

## Prerequisites

### 1. AWS Account Requirements

- AWS Account with Bedrock enabled (available in select regions)
- IAM permissions to enable model access
- VPC with private subnets (for AxonFlow deployment)

**Supported Regions:**
- `us-east-1` (N. Virginia)
- `us-west-2` (Oregon)
- `eu-central-1` (Frankfurt)
- `ap-southeast-1` (Singapore)

### 2. Model Access Approval

**IMPORTANT:** Bedrock models require explicit access approval (one-time setup).

**Steps:**
1. Open AWS Console → Bedrock → Model access
2. Click "Modify model access"
3. Select models you want to enable:
   - ✅ Claude 3.5 Sonnet
   - ✅ Claude 3 Haiku
   - ✅ Llama 3 70B
4. Submit access request
5. Wait for approval (instant for most models, 1-2 business days for some)

**Verification:**
```bash
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?modelId==`anthropic.claude-3-5-sonnet-20240620-v1:0`]'
```

If you see model details, access is granted.

---

## Setup: AxonFlow with Bedrock

### Option 1: AWS Marketplace Deployment (Recommended)

**If deploying AxonFlow via AWS Marketplace CloudFormation:**

1. **Launch CloudFormation Stack:**
   - Navigate to AWS Marketplace → AxonFlow
   - Click "Continue to Subscribe"
   - Launch CloudFormation template

2. **Configure Bedrock Parameters:**
   ```yaml
   LLMProvider: bedrock
   BedrockRegion: us-east-1
   BedrockDefaultModel: anthropic.claude-3-5-sonnet-20240620-v1:0
   ```

3. **IAM Permissions (Automatic):**
   - CloudFormation automatically creates IAM role with Bedrock permissions
   - Attached to ECS task execution role

4. **Deploy:**
   - CloudFormation completes in 15-20 minutes
   - AxonFlow agent auto-configured for Bedrock

### Option 2: Self-Hosted Deployment

**If deploying AxonFlow in your own infrastructure:**

#### Step 1: Create IAM Policy

Create IAM policy for Bedrock access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:*::foundation-model/meta.llama3-70b-instruct-v1:0"
      ]
    }
  ]
}
```

**Save as:** `bedrock-access-policy.json`

**Create policy:**
```bash
aws iam create-policy \
  --policy-name AxonFlowBedrockAccess \
  --policy-document file://bedrock-access-policy.json
```

#### Step 2: Attach Policy to AxonFlow Role

**If using ECS:**
```bash
aws iam attach-role-policy \
  --role-name AxonFlowTaskExecutionRole \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/AxonFlowBedrockAccess
```

**If using EC2:**
```bash
aws iam attach-role-policy \
  --role-name AxonFlowEC2Role \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/AxonFlowBedrockAccess
```

#### Step 3: Configure AxonFlow Environment

**Set environment variables:**

```bash
# Bedrock Configuration
export LLM_PROVIDER=bedrock
export BEDROCK_REGION=us-east-1
export BEDROCK_DEFAULT_MODEL=anthropic.claude-3-5-sonnet-20240620-v1:0

# Optional: VPC Endpoint (for private Bedrock access)
export BEDROCK_ENDPOINT_URL=https://vpce-xxxxx.bedrock-runtime.us-east-1.vpce.amazonaws.com
```

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  axonflow-agent:
    image: axonflow/agent:latest
    environment:
      - LLM_PROVIDER=bedrock
      - BEDROCK_REGION=us-east-1
      - BEDROCK_DEFAULT_MODEL=anthropic.claude-3-5-sonnet-20240620-v1:0
      - AWS_REGION=us-east-1
    volumes:
      - ~/.aws:/root/.aws:ro  # AWS credentials
```

#### Step 4: Verify Bedrock Connection

**Test API call:**
```bash
curl -X POST https://your-axonflow.com/v1/query \
  -H "Authorization: Bearer YOUR_LICENSE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the capital of France?",
    "model": "anthropic.claude-3-5-sonnet-20240620-v1:0"
  }'
```

**Expected Response:**
```json
{
  "response": "The capital of France is Paris.",
  "model": "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "latency_ms": 245,
  "tokens_used": {
    "input": 8,
    "output": 6
  }
}
```

---

## VPC Endpoint Setup (Optional - Enhanced Security)

**Use Case:** Private Bedrock access without internet gateway (compliance requirement for HIPAA, PCI DSS).

### Step 1: Create VPC Endpoint

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxx \
  --service-name com.amazonaws.us-east-1.bedrock-runtime \
  --route-table-ids rtb-xxxxx \
  --subnet-ids subnet-xxxxx subnet-yyyyy \
  --security-group-ids sg-xxxxx
```

**Security Group Rules:**
```bash
# Allow HTTPS from AxonFlow agents
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --source-group sg-axonflow-agents
```

### Step 2: Configure AxonFlow to Use VPC Endpoint

```bash
export BEDROCK_ENDPOINT_URL=https://vpce-xxxxx.bedrock-runtime.us-east-1.vpce.amazonaws.com
```

**Benefits:**
- Traffic stays within AWS network (no internet exposure)
- Lower latency (no NAT gateway hop)
- Compliance: HIPAA, PCI DSS, SOC 2

---

## Multi-Model Routing

**AxonFlow supports intelligent model routing based on query complexity.**

### Configuration Example

```yaml
# Agent configuration (agents.yaml)
agents:
  customer-support:
    default_model: anthropic.claude-3-haiku-20240307-v1:0
    routing_rules:
      - condition: "complexity > 0.7"
        model: anthropic.claude-3-5-sonnet-20240620-v1:0
      - condition: "language != 'en'"
        model: mistral.mistral-large-2402-v1:0
      - condition: "cost_sensitive == true"
        model: meta.llama3-70b-instruct-v1:0
```

### SDK Usage (TypeScript)

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  endpoint: 'https://your-axonflow.com',
  licenseKey: 'your-license-key'
});

// Simple query (uses Haiku - fast & cheap)
const simpleResult = await client.query({
  query: 'What time is it?',
  agent: 'customer-support'
});

// Complex query (auto-routes to Sonnet)
const complexResult = await client.query({
  query: 'Analyze this medical report and provide differential diagnosis...',
  agent: 'customer-support',
  metadata: { complexity: 0.9 }
});

// Explicit model override
const explicitResult = await client.query({
  query: 'Translate this to French...',
  agent: 'customer-support',
  model: 'mistral.mistral-large-2402-v1:0'
});
```

---

## Cost Optimization

### Strategy 1: Model Selection by Use Case

| Use Case | Recommended Model | Rationale |
|----------|-------------------|-----------|
| **High-volume customer support** | Claude 3 Haiku | 10x cheaper than Sonnet, 80% accuracy |
| **Code generation** | Claude 3.5 Sonnet | Best coding performance |
| **Data extraction** | Llama 3 70B | Structured output, low cost |
| **Medical diagnosis** | Claude 3 Opus | Highest accuracy, worth premium |
| **Multilingual support** | Mistral Large | Strong non-English performance |

### Strategy 2: Prompt Caching

**AxonFlow supports Bedrock prompt caching (reduces costs by 90% for repeated context).**

```typescript
// Enable prompt caching
const result = await client.query({
  query: 'What is patient 12345 diagnosis?',
  agent: 'medical-assistant',
  context: {
    systemPrompt: 'You are a medical AI assistant...',  // Cached
    patientHistory: '...',  // Cached
    currentSymptoms: 'fever, cough'  // Not cached (changes per query)
  },
  caching: {
    enabled: true,
    ttl: 3600  // Cache for 1 hour
  }
});
```

**Cost Savings Example:**
- Without caching: 1,000 queries × 2,000 tokens = $6.00
- With caching (90% cache hit): 1,000 queries × 200 tokens = $0.60
- **Savings: 90%**

### Strategy 3: Batch Processing

**Process multiple queries in a single Bedrock invocation:**

```typescript
const batchResult = await client.batchQuery({
  queries: [
    { query: 'Summarize email 1', agent: 'email-assistant' },
    { query: 'Summarize email 2', agent: 'email-assistant' },
    { query: 'Summarize email 3', agent: 'email-assistant' }
  ],
  model: 'anthropic.claude-3-haiku-20240307-v1:0'
});
```

**Cost Savings:**
- 3 separate calls: 3 × (overhead + processing) = higher cost
- 1 batch call: 1 × overhead + 3 × processing = 20-30% savings

### Strategy 4: Budget Policies

**AxonFlow enforces budget limits to prevent cost overruns:**

```yaml
# Policy configuration
policies:
  - name: daily-budget-limit
    type: budget
    scope: tenant:acme-corp
    limits:
      daily_tokens: 10000000  # 10M tokens/day
      daily_cost_usd: 100
    action: deny  # Deny requests exceeding limit
```

**Real-World Impact:**
- Customer: E-commerce company
- Use case: Product recommendations (high volume)
- Budget: $500/month
- Before AxonFlow policies: $2,300/month (overrun)
- After AxonFlow policies: $480/month (under budget)

---

## Monitoring & Observability

### CloudWatch Metrics

**AxonFlow publishes Bedrock usage metrics to CloudWatch:**

```bash
# View Bedrock API latency
aws cloudwatch get-metric-statistics \
  --namespace AxonFlow/Bedrock \
  --metric-name BedrockAPILatency \
  --dimensions Name=ModelId,Value=anthropic.claude-3-5-sonnet-20240620-v1:0 \
  --start-time 2025-11-11T00:00:00Z \
  --end-time 2025-11-11T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

**Available Metrics:**
- `BedrockAPILatency` (ms)
- `BedrockTokensUsed` (count)
- `BedrockCostUSD` (dollars)
- `BedrockErrorRate` (percentage)

### AxonFlow Dashboard

**Access usage dashboard:**
```
https://your-axonflow.com/dashboard/bedrock
```

**Metrics shown:**
- Cost per model (daily, weekly, monthly)
- Token usage breakdown
- P95/P99 latency
- Error rates by model
- Cache hit rate (if caching enabled)

### Cost Alerts

**Set up CloudWatch alarms for cost overruns:**

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name bedrock-daily-cost-limit \
  --alarm-description "Alert if Bedrock cost exceeds $100/day" \
  --metric-name BedrockCostUSD \
  --namespace AxonFlow/Bedrock \
  --statistic Sum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:bedrock-cost-alerts
```

---

## Troubleshooting

### Issue 1: "Access Denied" Error

**Symptom:**
```json
{
  "error": "AccessDeniedException: You don't have access to the model with the specified model ID."
}
```

**Solutions:**

1. **Check Model Access Approval:**
   ```bash
   aws bedrock list-foundation-models \
     --region us-east-1 \
     --query 'modelSummaries[?modelId==`anthropic.claude-3-5-sonnet-20240620-v1:0`]'
   ```
   If empty, enable model access in Bedrock console.

2. **Verify IAM Permissions:**
   ```bash
   aws iam get-role-policy \
     --role-name AxonFlowTaskExecutionRole \
     --policy-name BedrockAccess
   ```
   Ensure `bedrock:InvokeModel` permission exists.

3. **Check Region:**
   ```bash
   # Bedrock not available in all regions
   aws bedrock list-foundation-models --region us-east-1  # ✅ Works
   aws bedrock list-foundation-models --region us-east-2  # ❌ May not work
   ```

### Issue 2: High Latency (>1 second)

**Symptom:** Bedrock API calls taking >1 second (expected: 200-500ms).

**Solutions:**

1. **Use VPC Endpoint:**
   - Without VPC endpoint: Internet → NAT Gateway → Bedrock (500-1000ms)
   - With VPC endpoint: Private network → Bedrock (150-300ms)
   - **Setup:** See "VPC Endpoint Setup" section above

2. **Switch to Faster Model:**
   - Claude 3.5 Sonnet: 300-500ms
   - Claude 3 Haiku: 150-250ms (2x faster)

3. **Enable Prompt Caching:**
   - First call: 500ms (cache miss)
   - Subsequent calls: 50ms (cache hit)
   - **Setup:** See "Cost Optimization > Prompt Caching"

4. **Check Region Proximity:**
   ```bash
   # Deploy AxonFlow in same region as Bedrock
   # Bad: AxonFlow in eu-central-1, Bedrock in us-east-1 (+100ms latency)
   # Good: Both in us-east-1 (&lt;10ms latency)
   ```

### Issue 3: Throttling Errors

**Symptom:**
```json
{
  "error": "ThrottlingException: Rate exceeded"
}
```

**Solutions:**

1. **Check Bedrock Quotas:**
   ```bash
   aws service-quotas get-service-quota \
     --service-code bedrock \
     --quota-code L-xxxxx
   ```

   **Default Limits:**
   - Claude 3.5 Sonnet: 10,000 tokens/min
   - Claude 3 Haiku: 20,000 tokens/min

2. **Request Quota Increase:**
   - AWS Console → Service Quotas → Bedrock
   - Request increase (typically approved in 1-2 business days)

3. **Implement Exponential Backoff:**
   AxonFlow automatically retries with exponential backoff:
   ```
   Attempt 1: Immediate
   Attempt 2: 1 second delay
   Attempt 3: 2 seconds delay
   Attempt 4: 4 seconds delay
   ```

4. **Use Multiple Models:**
   ```yaml
   # Distribute load across models
   routing_rules:
     - condition: "load > 0.8"
       model: anthropic.claude-3-haiku-20240307-v1:0  # Higher quota
   ```

### Issue 4: Incorrect Model Output

**Symptom:** Model returns unexpected or incorrect responses.

**Solutions:**

1. **Check Model Version:**
   ```typescript
   // ❌ Bad: Using old model
   model: 'anthropic.claude-3-sonnet-20240229-v1:0'

   // ✅ Good: Using latest
   model: 'anthropic.claude-3-5-sonnet-20240620-v1:0'
   ```

2. **Verify Prompt Engineering:**
   ```typescript
   // ❌ Bad: Vague prompt
   query: 'Tell me about patient'

   // ✅ Good: Specific prompt
   query: 'Summarize patient P-12345 medical history in 3 bullet points'
   ```

3. **Adjust Temperature:**
   ```typescript
   // For factual queries (diagnosis, data extraction)
   temperature: 0.0  // Deterministic

   // For creative tasks (marketing copy)
   temperature: 0.7  // More creative
   ```

4. **Enable Audit Logs:**
   ```typescript
   const result = await client.query({
     query: 'Diagnose patient...',
     agent: 'medical-assistant',
     auditLog: true  // Logs full prompt + response
   });

   // Review audit log
   console.log(result.auditLog.prompt);  // See exactly what was sent to Bedrock
   ```

### Issue 5: Unexpected Costs

**Symptom:** Bedrock bill higher than expected.

**Solutions:**

1. **Enable Cost Tracking:**
   ```bash
   # Check daily costs
   aws ce get-cost-and-usage \
     --time-period Start=2025-11-01,End=2025-11-11 \
     --granularity DAILY \
     --metrics UnblendedCost \
     --filter file://bedrock-filter.json
   ```

   **bedrock-filter.json:**
   ```json
   {
     "Dimensions": {
       "Key": "SERVICE",
       "Values": ["Amazon Bedrock"]
     }
   }
   ```

2. **Review Token Usage:**
   ```typescript
   // AxonFlow dashboard: https://your-axonflow.com/dashboard/bedrock
   // Sort by: Cost (descending)
   // Identify: Which agents/queries are most expensive
   ```

3. **Implement Budget Policies:**
   ```yaml
   policies:
     - name: cost-per-query-limit
       type: budget
       scope: agent:customer-support
       limits:
         cost_per_query_usd: 0.10  # Max $0.10 per query
       action: deny
   ```

4. **Optimize Prompts:**
   ```typescript
   // ❌ Bad: Sending entire document (100K tokens)
   context: fullDocument

   // ✅ Good: Sending summary (5K tokens)
   context: documentSummary
   ```

---

## Security Best Practices

### 1. IAM Least Privilege

**Only grant necessary Bedrock permissions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"  // ✅ Required
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"
      ]
    },
    {
      "Effect": "Deny",
      "Action": [
        "bedrock:CreateModelCustomizationJob",  // ❌ Not needed for inference
        "bedrock:DeleteModel"  // ❌ Dangerous
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. VPC Endpoint for Private Access

**Route Bedrock traffic through VPC (no internet exposure):**

```bash
# Create VPC endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxx \
  --service-name com.amazonaws.us-east-1.bedrock-runtime \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-xxxxx subnet-yyyyy \
  --security-group-ids sg-bedrock-access
```

**Security Group Rules:**
```bash
# Inbound: Only from AxonFlow agents
aws ec2 authorize-security-group-ingress \
  --group-id sg-bedrock-access \
  --protocol tcp \
  --port 443 \
  --source-group sg-axonflow-agents

# Outbound: Deny all (endpoint traffic stays in VPC)
```

### 3. Audit Logging

**Enable CloudTrail for Bedrock API calls:**

```bash
aws cloudtrail create-trail \
  --name bedrock-api-audit \
  --s3-bucket-name bedrock-audit-logs \
  --include-global-service-events \
  --is-multi-region-trail

# Enable logging for Bedrock
aws cloudtrail put-event-selectors \
  --trail-name bedrock-api-audit \
  --event-selectors '[{"ReadWriteType": "All", "IncludeManagementEvents": true, "DataResources": [{"Type": "AWS::Bedrock::Model", "Values": ["arn:aws:bedrock:*:*:*/*"]}]}]'
```

**What's logged:**
- Who invoked Bedrock API (IAM user/role)
- When (timestamp)
- Which model
- Input/output token count
- Source IP

### 4. PII Filtering

**AxonFlow automatically filters PII before sending to Bedrock:**

```yaml
# Policy configuration
policies:
  - name: pii-filter
    type: content_filter
    scope: tenant:healthcare-customer
    filters:
      - type: pii_detection
        action: redact  # or deny
        entities:
          - SSN
          - CREDIT_CARD
          - EMAIL
          - PHONE_NUMBER
```

**Example:**
```
User query: "My SSN is 123-45-6789, can you help?"
Sent to Bedrock: "My SSN is [REDACTED], can you help?"
```

### 5. Encryption

**Data encryption at rest and in transit:**

- **In Transit:** HTTPS (TLS 1.2+) for all Bedrock API calls ✅ (default)
- **At Rest:** Bedrock stores no customer data ✅ (stateless)
- **AxonFlow Audit Logs:** Encrypted with AWS KMS
  ```bash
  aws s3api put-bucket-encryption \
    --bucket axonflow-audit-logs \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "arn:aws:kms:us-east-1:123456789012:key/xxxxx"
        }
      }]
    }'
  ```

---

## Migration Guide

### Migrating from OpenAI to Bedrock

**Step 1: Update Configuration**

```typescript
// Before (OpenAI)
const client = new AxonFlowClient({
  endpoint: 'https://your-axonflow.com',
  licenseKey: 'your-license-key',
  llmProvider: 'openai',
  openaiApiKey: 'sk-xxxxx'
});

// After (Bedrock)
const client = new AxonFlowClient({
  endpoint: 'https://your-axonflow.com',
  licenseKey: 'your-license-key',
  llmProvider: 'bedrock',
  bedrockRegion: 'us-east-1'
});
```

**Step 2: Model Mapping**

| OpenAI Model | Bedrock Equivalent | Notes |
|--------------|-------------------|-------|
| `gpt-4-turbo` | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Similar performance, 2x cheaper |
| `gpt-4` | `anthropic.claude-3-opus-20240229-v1:0` | Highest accuracy |
| `gpt-3.5-turbo` | `anthropic.claude-3-haiku-20240307-v1:0` | Fast, cheap |

**Step 3: Test Queries**

```typescript
// Run parallel test: OpenAI vs Bedrock
const [openaiResult, bedrockResult] = await Promise.all([
  client.query({ query: 'Test query', llmProvider: 'openai' }),
  client.query({ query: 'Test query', llmProvider: 'bedrock' })
]);

console.log('OpenAI:', openaiResult.response);
console.log('Bedrock:', bedrockResult.response);
console.log('Cost diff:', openaiResult.cost - bedrockResult.cost);
```

**Step 4: Gradual Rollout**

```yaml
# Route 10% traffic to Bedrock, 90% to OpenAI
routing_rules:
  - condition: "random() < 0.1"
    llm_provider: bedrock
  - condition: "random() >= 0.1"
    llm_provider: openai
```

Gradually increase Bedrock traffic: 10% → 25% → 50% → 100%

---

## Performance Benchmarks

### Latency Comparison

| Model | P50 Latency | P95 Latency | P99 Latency |
|-------|-------------|-------------|-------------|
| **Claude 3.5 Sonnet** | 280ms | 450ms | 650ms |
| **Claude 3 Haiku** | 180ms | 290ms | 420ms |
| **Llama 3 70B** | 320ms | 520ms | 720ms |
| **Mistral Large** | 310ms | 490ms | 680ms |

**Test Setup:** 10,000 queries, 500 tokens/query, us-east-1, VPC endpoint enabled

### Cost Comparison (1M Tokens)

| Model | Input Cost | Output Cost | Total (1M input + 1M output) |
|-------|-----------|------------|------------------------------|
| **Claude 3.5 Sonnet** | $3.00 | $15.00 | $18.00 |
| **Claude 3 Haiku** | $0.25 | $1.25 | $1.50 |
| **Llama 3 70B** | $0.99 | $0.99 | $1.98 |
| **GPT-4 Turbo (OpenAI)** | $10.00 | $30.00 | $40.00 |

**Key Insight:** Bedrock models are 50-90% cheaper than OpenAI equivalents.

### Throughput Benchmark

| Model | Queries/Second (Single Instance) | Max Concurrent |
|-------|----------------------------------|----------------|
| **Claude 3.5 Sonnet** | 45 | 100 |
| **Claude 3 Haiku** | 80 | 200 |
| **Llama 3 70B** | 35 | 80 |

**Note:** With AxonFlow's load balancing, throughput scales linearly with instances.

---

## Compliance & Certifications

### HIPAA Compliance

**AWS Bedrock is HIPAA eligible** when used with Business Associate Addendum (BAA).

**Setup:**
1. Sign BAA with AWS (AWS Console → Artifact → Agreements)
2. Enable CloudTrail logging (audit trail requirement)
3. Use VPC endpoint (no internet exposure)
4. Configure AxonFlow PII filtering

**AxonFlow HIPAA Configuration:**
```yaml
compliance:
  hipaa:
    enabled: true
    pii_filtering: true
    audit_retention_days: 2555  # 7 years (HIPAA requirement)
    encryption: aws_kms
```

### GDPR Compliance

**Data residency:** Deploy in EU regions (eu-central-1, eu-west-1)

```bash
# Deploy AxonFlow + Bedrock in Frankfurt (EU)
export AWS_REGION=eu-central-1
export BEDROCK_REGION=eu-central-1
```

**GDPR Rights Support:**
- **Right to access:** AxonFlow audit logs
- **Right to deletion:** Delete tenant data via API
- **Right to portability:** Export audit logs to S3

### SOC 2 Compliance

**AWS Bedrock is SOC 2 Type II certified.**

**AxonFlow SOC 2 Controls:**
- CC6.1: Logical access controls (IAM)
- CC6.6: Encryption (TLS + KMS)
- CC7.2: System monitoring (CloudWatch)

---

## FAQ

### Q: Which Bedrock model should I use?

**A:** Depends on use case:
- **Complex reasoning / code generation:** Claude 3.5 Sonnet
- **High volume / cost-sensitive:** Claude 3 Haiku or Llama 3 70B
- **Highest accuracy (worth premium):** Claude 3 Opus
- **EU compliance / multilingual:** Mistral Large

### Q: How much does Bedrock cost compared to OpenAI?

**A:** Bedrock is 50-90% cheaper:
- GPT-4 Turbo: $40/1M tokens (input + output)
- Claude 3.5 Sonnet: $18/1M tokens (55% cheaper)
- Claude 3 Haiku: $1.50/1M tokens (96% cheaper)

### Q: Does AxonFlow add latency to Bedrock calls?

**A:** AxonFlow adds &lt;10ms overhead (P95):
- Direct Bedrock call: 280ms
- Via AxonFlow: 288ms (+8ms for governance)

### Q: Can I use multiple Bedrock models simultaneously?

**A:** Yes, AxonFlow supports multi-model routing:
```yaml
routing_rules:
  - condition: "complexity > 0.7"
    model: claude-3-5-sonnet
  - condition: "cost_sensitive == true"
    model: llama-3-70b
```

### Q: Is Bedrock HIPAA compliant?

**A:** Yes, with BAA signed. See "Compliance & Certifications" section.

### Q: How do I debug Bedrock errors?

**A:** Enable audit logging:
```typescript
const result = await client.query({
  query: 'Test',
  auditLog: true
});
console.log(result.auditLog.bedrockRequest);  // See exact API call
```

### Q: Can I use custom fine-tuned models?

**A:** Yes, Bedrock supports model customization:
1. Fine-tune model in Bedrock console
2. Get custom model ARN
3. Configure AxonFlow:
   ```yaml
   model: arn:aws:bedrock:us-east-1:123456789012:custom-model/my-model
   ```

---

## Support

### AxonFlow Support
- **Documentation:** https://docs.getaxonflow.com
- **Support Email:** support@getaxonflow.com
- **Slack Community:** https://axonflow-community.slack.com

### AWS Bedrock Support
- **Documentation:** https://docs.aws.amazon.com/bedrock/
- **Support:** AWS Support Console (Business/Enterprise plans)
- **Forums:** https://repost.aws/tags/bedrock

---

**Last Updated:** November 11, 2025
**Tested with:** AxonFlow v1.0.12, AWS Bedrock (Nov 2025 API version)
**Maintainers:** AxonFlow Documentation Team
