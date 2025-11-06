# Snowflake Connector

Connect AxonFlow to Snowflake data warehouse for analytics, reporting, and large-scale data operations.

## Overview

The Snowflake MCP connector enables your AI agents to:
- Query large datasets with SQL
- Run analytics and aggregations
- Export data for reporting
- Execute data transformations

**Use Cases:**
- Business intelligence queries
- Customer analytics
- Revenue reporting
- Data-driven decision making

---

## Setup

### 1. Create Snowflake User

```sql
-- Create user for AxonFlow
CREATE USER axonflow_agent
  PASSWORD = 'secure-password'
  DEFAULT_ROLE = analyst
  DEFAULT_WAREHOUSE = compute_wh
  DEFAULT_NAMESPACE = prod_db.public;

-- Grant required privileges
GRANT ROLE analyst TO USER axonflow_agent;
GRANT USAGE ON WAREHOUSE compute_wh TO ROLE analyst;
GRANT USAGE ON DATABASE prod_db TO ROLE analyst;
GRANT USAGE ON SCHEMA prod_db.public TO ROLE analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA prod_db.public TO ROLE analyst;
```

### 2. Get Connection Details

From Snowflake account:
- **Account:** `abc123.us-east-1` (format: `account.region`)
- **Username:** `axonflow_agent`
- **Password:** Your secure password
- **Warehouse:** `compute_wh`
- **Database:** `prod_db`
- **Schema:** `public`

### 3. Configure AxonFlow

Contact your AxonFlow administrator with:
```bash
MCP_snowflake_warehouse_ACCOUNT="abc123.us-east-1"
MCP_snowflake_warehouse_USERNAME="axonflow_agent"
MCP_snowflake_warehouse_PASSWORD="secure-password"
MCP_snowflake_warehouse_DATABASE="prod_db"
MCP_snowflake_warehouse_SCHEMA="public"
MCP_snowflake_warehouse_WAREHOUSE="compute_wh"
MCP_snowflake_warehouse_ROLE="analyst"
```

---

## Usage Examples

### Simple Analytics Query

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  licenseKey: 'your-license-key'
});

// Query monthly revenue
const revenue = await client.mcp.query({
  connector: 'snowflake_warehouse',
  statement: `
    SELECT
      DATE_TRUNC('month', order_date) as month,
      COUNT(*) as orders,
      SUM(amount) as revenue
    FROM orders
    WHERE order_date >= DATEADD(month, -12, CURRENT_DATE())
    GROUP BY month
    ORDER BY month DESC
  `,
  parameters: {},
  limit: 12
});

console.log('Monthly revenue:', revenue.rows);
```

### Customer Segmentation

```typescript
// Analyze customer segments
const segments = await client.mcp.query({
  connector: 'snowflake_warehouse',
  statement: `
    SELECT
      CASE
        WHEN total_spent >= 10000 THEN 'Premium'
        WHEN total_spent >= 5000 THEN 'Gold'
        WHEN total_spent >= 1000 THEN 'Silver'
        ELSE 'Bronze'
      END as segment,
      COUNT(*) as customers,
      AVG(total_spent) as avg_spent
    FROM (
      SELECT
        customer_id,
        SUM(amount) as total_spent
      FROM orders
      GROUP BY customer_id
    )
    GROUP BY segment
    ORDER BY avg_spent DESC
  `,
  parameters: {}
});

console.log('Customer segments:', segments.rows);
```

### Time-Series Analysis

```typescript
// Analyze daily active users trend
const dau = await client.mcp.query({
  connector: 'snowflake_warehouse',
  statement: `
    SELECT
      DATE(event_time) as date,
      COUNT(DISTINCT user_id) as active_users
    FROM events
    WHERE event_time >= DATEADD(day, -30, CURRENT_DATE())
    GROUP BY date
    ORDER BY date
  `,
  parameters: {},
  limit: 30
});
```

---

## Common Use Cases

### 1. Revenue Dashboard

```typescript
async function getRevenueDashboard() {
  const metrics = await client.mcp.query({
    connector: 'snowflake_warehouse',
    statement: `
      SELECT
        SUM(amount) as total_revenue,
        COUNT(DISTINCT customer_id) as customers,
        COUNT(*) as orders,
        AVG(amount) as avg_order_value
      FROM orders
      WHERE order_date >= DATEADD(month, -1, CURRENT_DATE())
    `,
    parameters: {}
  });

  return metrics.rows[0];
}
```

### 2. Cohort Analysis

```typescript
async function getCohortRetention() {
  return await client.mcp.query({
    connector: 'snowflake_warehouse',
    statement: `
      WITH cohorts AS (
        SELECT
          customer_id,
          DATE_TRUNC('month', MIN(order_date)) as cohort_month,
          DATE_TRUNC('month', order_date) as order_month
        FROM orders
        GROUP BY customer_id, DATE_TRUNC('month', order_date)
      )
      SELECT
        cohort_month,
        order_month,
        COUNT(DISTINCT customer_id) as customers
      FROM cohorts
      WHERE cohort_month >= DATEADD(month, -12, CURRENT_DATE())
      GROUP BY cohort_month, order_month
      ORDER BY cohort_month, order_month
    `,
    parameters: {}
  });
}
```

### 3. Product Performance

```typescript
async function getTopProducts(limit: number = 10) {
  return await client.mcp.query({
    connector: 'snowflake_warehouse',
    statement: `
      SELECT
        product_id,
        product_name,
        COUNT(*) as orders,
        SUM(quantity) as units_sold,
        SUM(amount) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE order_date >= DATEADD(month, -1, CURRENT_DATE())
      GROUP BY product_id, product_name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `,
    parameters: {}
  });
}
```

---

## SQL Tips

### Window Functions

```sql
-- Running total
SELECT
  date,
  revenue,
  SUM(revenue) OVER (ORDER BY date) as cumulative_revenue
FROM daily_revenue

-- Rank products
SELECT
  product_name,
  revenue,
  RANK() OVER (ORDER BY revenue DESC) as rank
FROM product_revenue
```

### Date Functions

```sql
-- Current quarter
WHERE order_date >= DATE_TRUNC('quarter', CURRENT_DATE())

-- Last 90 days
WHERE order_date >= DATEADD(day, -90, CURRENT_DATE())

-- Year over year
WHERE order_date >= DATEADD(year, -1, CURRENT_DATE())
```

### JSON Operations

```sql
-- Parse JSON column
SELECT
  user_id,
  data:profile.email::string as email,
  data:profile.age::integer as age
FROM users
```

---

## Performance Optimization

### 1. Pre-warm Warehouse

Warehouses suspend after 10 minutes of inactivity. First query after suspension is slower (10-30s).

**Solution:** Keep warehouse running during active hours:
```sql
ALTER WAREHOUSE compute_wh SET auto_suspend = 600; -- 10 minutes
```

### 2. Use Appropriate Warehouse Size

| Size | Credits/Hour | Best For |
|------|--------------|----------|
| X-Small | 1 | Light queries (< 1GB data) |
| Small | 2 | Standard queries (1-10GB) |
| Medium | 4 | Analytics (10-100GB) |
| Large | 8 | Heavy transformations |

### 3. Cluster Keys

For large tables (> 100GB):
```sql
ALTER TABLE orders CLUSTER BY (order_date);
```

### 4. Result Caching

Snowflake caches query results for 24 hours. Identical queries return instantly.

---

## Troubleshooting

### Connection Timeout

**Error:** `Connection timed out after 30s`

**Solution:**
1. Check network connectivity (VPC peering or public access)
2. Verify warehouse is running
3. Increase timeout:
   ```bash
   MCP_snowflake_warehouse_TIMEOUT="120s"
   ```

### Insufficient Privileges

**Error:** `SQL access control error: Insufficient privileges`

**Solution:** Grant required privileges:
```sql
GRANT SELECT ON ALL TABLES IN SCHEMA prod_db.public TO ROLE analyst;
```

### Warehouse Suspended

**Error:** `Warehouse 'COMPUTE_WH' is suspended`

**Solution:** Warehouse auto-resumes on first query. Wait 10-30s for startup.

---

## Security

- **Network Isolation:** Use VPC peering or IP whitelisting
- **User Credentials:** Dedicated service account with read-only access
- **Role-Based Access:** Use Snowflake roles for access control
- **Query Auditing:** All queries logged in Snowflake query history

---

## Performance

**Typical Latencies:**
- Simple query (< 1GB): 500-2000ms
- Medium query (1-10GB): 2-10 seconds
- Large query (10-100GB): 10-60 seconds
- First query after suspend: +10-30 seconds (warehouse startup)

**Cost Optimization:**
- **Result caching:** Free (24 hours)
- **Warehouse auto-suspend:** Set to 5-10 minutes
- **Right-size warehouse:** Start small, scale up if needed

---

## Limits

- **Max query execution:** 48 hours
- **Max concurrent queries:** Depends on warehouse size
- **Max result size:** 10GB (use LIMIT for large datasets)

---

## Related Documentation

- [MCP Overview](/mcp/overview.md)
- [Snowflake SQL Reference](https://docs.snowflake.com/en/sql-reference)
- [Snowflake Best Practices](https://docs.snowflake.com/en/user-guide/performance-query)

---

**Need Help?** Contact support@getaxonflow.com
