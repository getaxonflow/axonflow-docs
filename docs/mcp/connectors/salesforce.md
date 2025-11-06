# Salesforce Connector

Connect AxonFlow to Salesforce CRM for customer data, leads, opportunities, and custom objects.

## Overview

The Salesforce MCP connector enables your AI agents to:
- Query CRM data with SOQL
- Create, update, and delete records
- Access custom objects
- Automated data enrichment

**Use Cases:**
- Customer data enrichment
- Lead scoring automation
- Opportunity tracking
- Support ticket integration

---

## Setup

### 1. Create Connected App

1. In Salesforce Setup, search "App Manager"
2. Click "New Connected App"
3. Fill in basic information:
   - **Name:** AxonFlow Agent
   - **API Name:** axonflow_agent
   - **Contact Email:** your-email@company.com
4. Enable OAuth Settings:
   - **Callback URL:** `https://login.salesforce.com/services/oauth2/token`
   - **Selected OAuth Scopes:**
     - Full access (full)
     - Perform requests at any time (refresh_token, offline_access)
5. Save and note your **Consumer Key** (Client ID) and **Consumer Secret**

### 2. Configure AxonFlow

Contact your AxonFlow administrator with:
```bash
MCP_salesforce_crm_CLIENT_ID="your-consumer-key"
MCP_salesforce_crm_CLIENT_SECRET="your-consumer-secret"
MCP_salesforce_crm_USERNAME="your-salesforce-username"
MCP_salesforce_crm_PASSWORD="your-salesforce-password"
MCP_salesforce_crm_SECURITY_TOKEN="your-security-token"  # Optional
```

**Getting Security Token:** Profile → Settings → Reset My Security Token

---

## Usage Examples

### Query Contacts

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  licenseKey: 'your-license-key'
});

// Query contacts by account
const contacts = await client.mcp.query({
  connector: 'salesforce_crm',
  statement: 'SELECT Id, Name, Email, Phone FROM Contact WHERE AccountId = \'001xx000003DHP0AAO\' LIMIT 10',
  parameters: {}
});

console.log('Contacts:', contacts.rows);
```

### Create New Lead

```typescript
// Create a new lead
const result = await client.mcp.execute({
  connector: 'salesforce_crm',
  action: 'INSERT',
  statement: 'Lead',
  parameters: {
    sobject_type: 'Lead',
    FirstName: 'John',
    LastName: 'Doe',
    Email: 'john.doe@example.com',
    Company: 'Acme Corporation',
    Status: 'Open - Not Contacted'
  }
});

console.log('Lead created:', result.success);
```

### Update Opportunity

```typescript
// Update opportunity stage
await client.mcp.execute({
  connector: 'salesforce_crm',
  action: 'UPDATE',
  statement: 'Opportunity',
  parameters: {
    sobject_type: 'Opportunity',
    id: '006xx000001J9hQAAS',
    StageName: 'Closed Won',
    CloseDate: '2025-12-31'
  }
});
```

---

## Common Use Cases

### 1. Customer Enrichment

```typescript
async function enrichCustomerData(email: string) {
  // Query Salesforce for customer info
  const contacts = await client.mcp.query({
    connector: 'salesforce_crm',
    statement: `SELECT Id, Name, Account.Name, Account.Industry, Phone FROM Contact WHERE Email = '${email}' LIMIT 1`,
    parameters: {}
  });

  if (contacts.row_count > 0) {
    return contacts.rows[0];
  }
  return null;
}
```

### 2. Automated Lead Scoring

```typescript
async function updateLeadScore(leadId: string, score: number) {
  await client.mcp.execute({
    connector: 'salesforce_crm',
    action: 'UPDATE',
    statement: 'Lead',
    parameters: {
      sobject_type: 'Lead',
      id: leadId,
      Lead_Score__c: score
    }
  });
}
```

### 3. Support Case Integration

```typescript
async function createSupportCase(contactId: string, subject: string, description: string) {
  const result = await client.mcp.execute({
    connector: 'salesforce_crm',
    action: 'INSERT',
    statement: 'Case',
    parameters: {
      sobject_type: 'Case',
      ContactId: contactId,
      Subject: subject,
      Description: description,
      Priority: 'High',
      Status: 'New'
    }
  });

  return result;
}
```

---

## SOQL Tips

### Relationships

```sql
-- Query parent object
SELECT Name, Account.Name, Account.Industry FROM Contact

-- Query child relationships
SELECT Name, (SELECT Name FROM Contacts) FROM Account
```

### Date Filters

```sql
-- Recent opportunities
SELECT Id, Name, Amount FROM Opportunity WHERE CreatedDate = LAST_N_DAYS:30

-- This quarter
SELECT Id, Name, Amount FROM Opportunity WHERE CloseDate = THIS_QUARTER
```

### Aggregates

```sql
-- Count records
SELECT COUNT() FROM Lead WHERE Status = 'Open - Not Contacted'

-- Sum amounts
SELECT SUM(Amount) FROM Opportunity WHERE StageName = 'Closed Won'
```

---

## Troubleshooting

### Invalid Grant Error

**Error:** `invalid_grant`

**Solution:** Check:
1. Username/password are correct
2. Security token is appended to password
3. IP address is whitelisted in Salesforce (Profile → Login IP Ranges)

### SOQL Query Limits

Salesforce has governor limits:
- **Max records returned:** 2,000 per query
- **Max execution time:** 120 seconds
- **Max batch size:** 200 records

**Solution:** Use LIMIT clause and pagination

### Session Timeout

**Error:** `INVALID_SESSION_ID`

AxonFlow automatically refreshes OAuth tokens. If issue persists, check:
1. Connected App is active
2. OAuth scopes are correct
3. User has API access enabled

---

## API Reference

### Methods

| Method | SOQL Equivalent | Description |
|--------|-----------------|-------------|
| `query` | SELECT | Read records |
| `INSERT` | INSERT | Create records |
| `UPDATE` | UPDATE | Update records |
| `DELETE` | DELETE | Delete records |

### Response Format

```typescript
{
  success: boolean;
  rows_affected: number;
  duration_ms: number;
  message: string;
}
```

---

## Security

- **OAuth 2.0:** Uses password grant flow with automatic token refresh
- **Tenant Isolation:** Each tenant has separate Salesforce credentials
- **Field-Level Security:** Respects Salesforce field permissions
- **IP Whitelisting:** Configure in Salesforce if required

---

## Performance

**Typical Latencies:**
- Simple query (< 100 rows): 200-400ms
- Complex query with joins: 500-1000ms
- Insert/Update/Delete: 300-500ms

**Governor Limits:**
- 5,000 queries per 24 hours (Salesforce limit)
- Max 2,000 records per query result

---

## Related Documentation

- [MCP Overview](/mcp/overview.md)
- [SOQL Reference](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/)
- [Salesforce REST API](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)

---

**Need Help?** Contact support@getaxonflow.com
