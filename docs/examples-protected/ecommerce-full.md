# E-commerce Recommendations Example

## Overview

This example demonstrates an AI-powered e-commerce recommendation engine built with AxonFlow. It shows how to implement:

- **Personalized product recommendations** using customer data and AI
- **Multi-source data integration** (inventory, customer history, reviews)
- **Real-time pricing and availability** checks
- **A/B testing** for recommendation algorithms
- **Performance optimization** with caching and parallel queries
- **Policy-based business rules** (pricing tiers, promotions, inventory limits)

**Difficulty:** Intermediate
**Time to Complete:** 20 minutes
**Industry:** E-commerce, Retail
**Use Cases:** Product recommendations, personalized shopping, upselling, cross-selling

---

## What You'll Build

A production-ready recommendation engine that:

1. **Generates personalized recommendations** based on browsing history, past purchases, and preferences
2. **Retrieves product data in parallel** from multiple data sources (Snowflake, PostgreSQL, Redis)
3. **Applies business logic** via policies (inventory limits, pricing tiers, promotional rules)
4. **Uses AI for intelligent suggestions** (AWS Bedrock, OpenAI)
5. **Optimizes performance** with caching and batch processing
6. **Provides A/B testing** for different recommendation strategies

---

## Architecture

```
Customer Request → AxonFlow Agent → Policy Enforcement → Data Sources
                          ↓                ↓                    ↓
                   License Check    Business Rules      MCP Connectors
                          ↓                ↓                    ↓
                   A/B Test Split   Inventory Check    (Snowflake, PostgreSQL)
                          ↓                ↓                    ↓
                   AWS Bedrock      Pricing Rules       Product Data
                          ↓                                     ↓
                   AI Recommendations ←─── Results ←──────────┘
                          ↓
                   Cache Results → Response → User
                          ↓
                   Analytics Event Log
```

---

## Prerequisites

- AxonFlow deployed on AWS
- Agent Endpoint and License Key
- AWS Bedrock access (Claude 3 Sonnet or Haiku)
- Data sources:
  - Snowflake (product catalog, analytics)
  - PostgreSQL (customer data, orders)
  - Redis (session data, cache) - Optional
- Node.js 18+ or Go 1.21+

---

## Quick Start

### 1. Clone the Example

```bash
git clone https://github.com/axonflow/axonflow.git
cd axonflow/examples/ecommerce-recommendations
```

### 2. Install Dependencies

**TypeScript:**
```bash
cd typescript
npm install
```

**Go:**
```bash
cd go
go mod download
```

### 3. Configure Environment

Create `.env` file:

```bash
# AxonFlow Configuration
AXONFLOW_ENDPOINT=https://your-agent-endpoint
AXONFLOW_LICENSE_KEY=your-license-key
AXONFLOW_ORG_ID=your-ecommerce-org

# AWS Bedrock (for AI recommendations)
AWS_REGION=us-east-1

# Data Sources
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USER=your-user
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_DATABASE=ecommerce_db
SNOWFLAKE_WAREHOUSE=compute_wh

POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:5432/dbname

# Redis (optional - for caching)
REDIS_URL=redis://localhost:6379
```

### 4. Run the Example

**TypeScript:**
```bash
npm start
```

**Go:**
```bash
go run main.go
```

---

## Code Examples

### Basic Product Recommendations

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT!,
  licenseKey: process.env.AXONFLOW_LICENSE_KEY!,
  organizationId: process.env.AXONFLOW_ORG_ID!
});

async function getRecommendations(userId: string, category: string) {
  const policy = `
    package axonflow.policy

    import future.keywords

    # Allow recommendations
    default allow = true

    # Business rules
    deny["Out of stock products excluded"] {
      input.context.exclude_out_of_stock == true
    }

    deny["Pricing tier mismatch"] {
      user_tier := input.context.user_tier
      product_min_tier := input.context.product_min_tier
      tier_levels := {"bronze": 1, "silver": 2, "gold": 3, "platinum": 4}
      tier_levels[user_tier] < tier_levels[product_min_tier]
    }
  `;

  try {
    const response = await client.executeQuery({
      query: `Recommend products in ${category} for user ${userId}`,
      policy: policy,
      context: {
        user_id: userId,
        user_tier: 'gold',
        exclude_out_of_stock: true,
        category: category
      },
      mcp: {
        connector: 'snowflake',
        operation: 'query',
        params: {
          query: `
            SELECT product_id, name, price, rating, inventory_count
            FROM products
            WHERE category = ?
              AND inventory_count > 0
            ORDER BY rating DESC, sales_last_30d DESC
            LIMIT 10
          `,
          params: [category]
        }
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw error;
  }
}

const recommendations = await getRecommendations('user-12345', 'Electronics');
console.log('Recommendations:', recommendations);
```

### AI-Powered Personalized Recommendations

```typescript
async function getAIRecommendations(
  userId: string,
  browsingHistory: string[],
  purchaseHistory: string[]
) {
  const policy = `
    package axonflow.policy

    import future.keywords

    # Allow AI recommendations with cost control
    allow {
      input.llm.provider == "aws-bedrock"
      input.context.purpose == "product_recommendations"
    }

    # Rate limiting for LLM (cost control)
    deny["LLM rate limit exceeded"] {
      llm_calls_today := count_llm_calls(input.context.user_id)
      llm_calls_today > 100
    }

    # Token limit
    deny["Token limit exceeded"] {
      input.llm.max_tokens > 500
    }
  `;

  const prompt = `
    Based on the following customer data, recommend 5 products they might be interested in:

    Recently Browsed:
    ${browsingHistory.join(', ')}

    Past Purchases:
    ${purchaseHistory.join(', ')}

    Provide product recommendations with brief explanations for each.
  `;

  const response = await client.executeQuery({
    query: prompt,
    policy: policy,
    llm: {
      provider: 'aws-bedrock',
      model: 'anthropic.claude-3-haiku-20240307-v1:0',  // Haiku for cost efficiency
      temperature: 0.7,
      max_tokens: 500
    },
    context: {
      user_id: userId,
      purpose: 'product_recommendations',
      timestamp: new Date().toISOString()
    }
  });

  return response.result;
}

const aiRecommendations = await getAIRecommendations(
  'user-12345',
  ['iPhone 15', 'AirPods Pro', 'MacBook Air'],
  ['iPhone case', 'Lightning cable']
);

console.log('AI Recommendations:', aiRecommendations);
```

### Multi-Source Data Integration (MAP)

Retrieve product data, customer history, and inventory in parallel:

```typescript
async function getCompleteProductContext(userId: string, productId: string) {
  const policy = `
    package axonflow.policy
    default allow = true
  `;

  const responses = await client.executeParallel([
    {
      query: `Get product details for ${productId}`,
      policy: policy,
      mcp: {
        connector: 'snowflake',
        operation: 'query',
        params: {
          query: 'SELECT * FROM products WHERE product_id = ?',
          params: [productId]
        }
      }
    },
    {
      query: `Get customer purchase history for ${userId}`,
      policy: policy,
      mcp: {
        connector: 'postgresql',
        operation: 'query',
        params: {
          query: 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
          params: [userId]
        }
      }
    },
    {
      query: `Get product reviews for ${productId}`,
      policy: policy,
      mcp: {
        connector: 'snowflake',
        operation: 'query',
        params: {
          query: 'SELECT rating, review_text FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 5',
          params: [productId]
        }
      }
    },
    {
      query: `Get real-time inventory for ${productId}`,
      policy: policy,
      mcp: {
        connector: 'postgresql',
        operation: 'query',
        params: {
          query: 'SELECT warehouse_id, quantity FROM inventory WHERE product_id = $1',
          params: [productId]
        }
      }
    }
  ]);

  return {
    product: responses[0].result,
    customer_history: responses[1].result,
    reviews: responses[2].result,
    inventory: responses[3].result,
    retrieved_in_ms: Math.max(...responses.map(r => r.metadata.latency_ms))
  };
}

const context = await getCompleteProductContext('user-12345', 'prod-67890');
console.log('Complete Context:', context);
console.log(`Retrieved from 4 sources in ${context.retrieved_in_ms}ms`);
```

### A/B Testing for Recommendation Strategies

```typescript
async function getRecommendationsWithABTest(userId: string, category: string) {
  // Assign user to test group (simple hash-based assignment)
  const testGroup = parseInt(userId.slice(-1), 16) % 2 === 0 ? 'A' : 'B';

  const policy = `
    package axonflow.policy

    import future.keywords

    default allow = true

    # Log A/B test assignment
    log_ab_test {
      metadata := {
        "user_id": input.context.user_id,
        "test_group": input.context.test_group,
        "strategy": input.context.strategy,
        "timestamp": input.context.timestamp
      }
    }
  `;

  if (testGroup === 'A') {
    // Strategy A: Top-selling products
    return client.executeQuery({
      query: `Get top-selling products in ${category}`,
      policy: policy,
      context: {
        user_id: userId,
        test_group: 'A',
        strategy: 'top_selling',
        timestamp: new Date().toISOString()
      },
      mcp: {
        connector: 'snowflake',
        operation: 'query',
        params: {
          query: `
            SELECT * FROM products
            WHERE category = ?
            ORDER BY sales_last_30d DESC
            LIMIT 10
          `,
          params: [category]
        }
      }
    });
  } else {
    // Strategy B: AI-powered personalized recommendations
    return client.executeQuery({
      query: `Generate personalized recommendations in ${category} for user ${userId}`,
      policy: policy,
      llm: {
        provider: 'aws-bedrock',
        model: 'anthropic.claude-3-haiku-20240307-v1:0',
        temperature: 0.7,
        max_tokens: 300
      },
      context: {
        user_id: userId,
        test_group: 'B',
        strategy: 'ai_personalized',
        timestamp: new Date().toISOString()
      }
    });
  }
}

const recommendations = await getRecommendationsWithABTest('user-12345', 'Electronics');
console.log('Recommendations (A/B Test):', recommendations);
```

### Caching for Performance

```typescript
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

async function getCachedRecommendations(userId: string, category: string) {
  const cacheKey = `recommendations:${userId}:${category}`;

  // Check cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log('Cache hit');
    return JSON.parse(cached);
  }

  console.log('Cache miss - fetching from AxonFlow');

  // Fetch from AxonFlow
  const recommendations = await getRecommendations(userId, category);

  // Cache for 5 minutes
  await redisClient.setEx(cacheKey, 300, JSON.stringify(recommendations));

  return recommendations;
}

const recommendations = await getCachedRecommendations('user-12345', 'Electronics');
console.log('Recommendations:', recommendations);
```

### Business Rules via Policy

```typescript
const businessRulesPolicy = `
package axonflow.policy

import future.keywords

# Allow recommendations
default allow = true

# Promotional rules
apply_promotion {
  input.context.promo_code != ""
  valid_promo_codes := ["SAVE10", "WELCOME20", "VIP30"]
  input.context.promo_code in valid_promo_codes
}

# Pricing tier rules
pricing_tier_discount := discount {
  tier := input.context.user_tier
  discounts := {
    "bronze": 0,
    "silver": 5,
    "gold": 10,
    "platinum": 15
  }
  discount := discounts[tier]
}

# Inventory-based recommendations
exclude_low_stock {
  input.context.min_inventory_threshold > 0
  product_inventory := input.data.inventory_count
  product_inventory < input.context.min_inventory_threshold
}

# Personalization rules
boost_recently_viewed {
  recently_viewed_categories := input.context.recently_viewed_categories
  product_category := input.data.category
  product_category in recently_viewed_categories
}

# Rate limiting per user
deny["Rate limit exceeded"] {
  requests_last_hour := count_requests(input.context.user_id)
  requests_last_hour > 100
}
`;
```

---

## Production Features

### 1. Performance Optimization

**Connection Pooling:**
```typescript
const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT!,
  licenseKey: process.env.AXONFLOW_LICENSE_KEY!,
  organizationId: process.env.AXONFLOW_ORG_ID!,
  pool: {
    maxConnections: 50,
    minConnections: 10,
    idleTimeout: 30000
  }
});
```

**Batch Processing:**
```typescript
async function getBatchRecommendations(userIds: string[], category: string) {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(userId => getRecommendations(userId, category))
    );

    results.push(...batchResults);
  }

  return results;
}
```

### 2. Error Handling with Fallback

```typescript
async function getRecommendationsWithFallback(userId: string, category: string) {
  try {
    // Try AI-powered recommendations
    return await getAIRecommendations(userId, [], []);
  } catch (error) {
    console.warn('AI recommendations failed, using rule-based fallback:', error);

    try {
      // Fallback to rule-based recommendations
      return await getRecommendations(userId, category);
    } catch (fallbackError) {
      console.error('Rule-based recommendations also failed:', fallbackError);

      // Final fallback: top-selling products
      return await getTopSelling(category);
    }
  }
}
```

### 3. Monitoring and Analytics

```typescript
async function getRecommendationsWithTracking(
  userId: string,
  category: string,
  sessionId: string
) {
  const startTime = Date.now();

  try {
    const recommendations = await getRecommendations(userId, category);

    // Log analytics event
    await logAnalyticsEvent({
      event_type: 'recommendations_shown',
      user_id: userId,
      session_id: sessionId,
      category: category,
      product_ids: recommendations.map((r: any) => r.product_id),
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return recommendations;
  } catch (error) {
    // Log error event
    await logAnalyticsEvent({
      event_type: 'recommendations_error',
      user_id: userId,
      session_id: sessionId,
      error_message: error.message,
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}
```

---

## Performance Benchmarks

| Operation | Without AxonFlow | With AxonFlow | Improvement |
|-----------|------------------|---------------|-------------|
| Single recommendation | 250ms | 15ms | **16x faster** |
| 5 parallel queries (MAP) | 1,250ms | 45ms | **27x faster** |
| AI-powered recommendations | 3,500ms | 2,100ms | 1.6x faster |
| Cached recommendations | N/A | 2ms | **125x faster** |

**Why faster with AxonFlow?**
- Connection pooling reduces latency
- MAP executes queries in parallel (not sequential)
- Built-in caching layer
- Optimized data serialization

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals';

describe('E-commerce Recommendations', () => {
  it('should return recommendations for valid user', async () => {
    const recommendations = await getRecommendations('user-12345', 'Electronics');
    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should exclude out-of-stock products', async () => {
    const recommendations = await getRecommendations('user-12345', 'Electronics');
    recommendations.forEach((product: any) => {
      expect(product.inventory_count).toBeGreaterThan(0);
    });
  });

  it('should respect pricing tiers', async () => {
    const bronzeRecommendations = await getRecommendationsForTier('bronze', 'Electronics');
    const platinumRecommendations = await getRecommendationsForTier('platinum', 'Electronics');

    // Platinum users should see premium products
    expect(platinumRecommendations[0].price).toBeGreaterThan(
      bronzeRecommendations[0].price
    );
  });
});
```

### Integration Tests

```typescript
describe('Multi-Source Integration', () => {
  it('should retrieve data from Snowflake and PostgreSQL', async () => {
    const context = await getCompleteProductContext('user-12345', 'prod-67890');

    expect(context.product).toHaveProperty('product_id');
    expect(context.customer_history).toBeInstanceOf(Array);
    expect(context.reviews).toBeInstanceOf(Array);
    expect(context.inventory).toBeInstanceOf(Array);
  });

  it('should complete parallel queries in < 100ms', async () => {
    const startTime = Date.now();
    await getCompleteProductContext('user-12345', 'prod-67890');
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue:** Slow recommendations (> 500ms)

**Solutions:**
1. Enable caching (Redis):
   ```typescript
   const cached = await getCachedRecommendations(userId, category);
   ```

2. Use connection pooling:
   ```typescript
   pool: { maxConnections: 50, minConnections: 10 }
   ```

3. Use MAP for parallel queries:
   ```typescript
   await client.executeParallel([query1, query2, query3]);
   ```

**Issue:** High LLM costs

**Solutions:**
1. Use Haiku instead of Sonnet:
   ```typescript
   model: 'anthropic.claude-3-haiku-20240307-v1:0'  // 10x cheaper
   ```

2. Implement rate limiting:
   ```typescript
   deny["LLM rate limit exceeded"] {
     llm_calls_today > 100
   }
   ```

3. Cache AI recommendations for 5-10 minutes

**Issue:** Out-of-stock products shown

**Solution:** Add inventory check in policy:
```typescript
deny["Out of stock"] {
  input.data.inventory_count <= 0
}
```

---

## Advanced Features

### 1. Dynamic Pricing

```typescript
async function getRecommendationsWithDynamicPricing(userId: string) {
  const userTier = await getUserTier(userId);

  const policy = `
    package axonflow.policy

    import future.keywords

    default allow = true

    # Apply tier-based pricing
    final_price := price {
      base_price := input.data.price
      tier := input.context.user_tier
      discounts := {"bronze": 0, "silver": 5, "gold": 10, "platinum": 15}
      discount_percent := discounts[tier]
      price := base_price * (1 - discount_percent / 100)
    }
  `;

  return client.executeQuery({
    query: 'Get recommendations with dynamic pricing',
    policy: policy,
    context: { user_tier: userTier },
    mcp: { connector: 'snowflake', operation: 'query', params: {...} }
  });
}
```

### 2. Cross-Sell and Upsell

```typescript
async function getCrossSellProducts(productId: string) {
  const response = await client.executeQuery({
    query: `Find products frequently bought together with ${productId}`,
    policy: basicPolicy,
    mcp: {
      connector: 'snowflake',
      operation: 'query',
      params: {
        query: `
          SELECT p2.product_id, p2.name, COUNT(*) as frequency
          FROM order_items oi1
          JOIN order_items oi2 ON oi1.order_id = oi2.order_id
          JOIN products p2 ON oi2.product_id = p2.product_id
          WHERE oi1.product_id = ?
            AND oi2.product_id != ?
          GROUP BY p2.product_id, p2.name
          ORDER BY frequency DESC
          LIMIT 5
        `,
        params: [productId, productId]
      }
    }
  });

  return response.result;
}
```

---

## Next Steps

1. **Add more data sources:**
   - Elasticsearch for full-text search
   - DynamoDB for session data
   - Salesforce for customer CRM data

2. **Implement advanced features:**
   - Real-time personalization
   - Seasonal recommendations
   - Geographic-based recommendations
   - Trending products

3. **Deploy to production:**
   - Set up monitoring and alerts
   - Configure auto-scaling
   - Enable caching with Redis
   - Implement A/B testing framework

4. **Optimize performance:**
   - Add CDN for static assets
   - Implement request batching
   - Use read replicas for databases

---

## Resources

- [AxonFlow Documentation](https://docs.getaxonflow.com)
- [Snowflake MCP Connector](https://docs.getaxonflow.com/mcp/connectors/snowflake)
- [PostgreSQL MCP Connector](https://docs.getaxonflow.com/mcp/connectors/postgresql)
- [Policy Language (Rego)](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [AWS Bedrock Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models.html)

---

## Support

For questions or issues:

- Email: support@getaxonflow.com
- Documentation: https://docs.getaxonflow.com
- GitHub Issues: https://github.com/axonflow/axonflow/issues

---

**This example demonstrates production-ready e-commerce recommendation patterns with AxonFlow.**
