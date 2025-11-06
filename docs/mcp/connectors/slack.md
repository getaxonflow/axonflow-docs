# Slack Connector

Connect AxonFlow to Slack for messaging, notifications, and collaboration workflows.

## Overview

The Slack MCP connector enables your AI agents to:
- Send messages to channels and users
- Post rich formatted notifications
- List channels and users
- Search message history

**Use Cases:**
- Automated incident alerts
- Customer support notifications
- Deployment status updates
- Team collaboration triggers

---

## Setup

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "AxonFlow Agent")
4. Select your workspace

### 2. Configure OAuth Scopes

Add these Bot Token Scopes:
- `channels:read` - List channels
- `channels:write` - Join channels
- `chat:write` - Send messages
- `users:read` - Get user information

### 3. Install App to Workspace

1. Click "Install to Workspace"
2. Authorize the app
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 4. Configure AxonFlow

Contact your AxonFlow administrator to add your Slack credentials:

```bash
MCP_slack_workspace_BOT_TOKEN="xoxb-your-slack-bot-token"
```

---

## Usage Examples

### Send a Simple Message

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  licenseKey: 'your-license-key'
});

// Send message to #general channel
const result = await client.mcp.execute({
  connector: 'slack_workspace',
  action: 'send_message',
  statement: '#general',
  parameters: {
    text: 'Deployment completed successfully!'
  }
});

console.log('Message sent:', result.success);
```

### Send Rich Formatted Message

```typescript
// Send message with blocks
const result = await client.mcp.execute({
  connector: 'slack_workspace',
  action: 'send_message',
  statement: '#alerts',
  parameters: {
    text: 'Production Incident Alert',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Production Incident'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Severity:* High\n*Service:* API Gateway\n*Status:* Investigating'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: '*Started:*\n2025-11-05 12:45 UTC'
          },
          {
            type: 'mrkdwn',
            text: '*Impact:*\n15% of requests failing'
          }
        ]
      }
    ]
  }
});
```

### List Channels

```typescript
// Get list of channels
const channels = await client.mcp.query({
  connector: 'slack_workspace',
  action: 'list_channels',
  parameters: {
    types: 'public_channel,private_channel',
    limit: 50
  }
});

console.log('Available channels:', channels.rows);
```

### Conditional Notifications

```typescript
// Send alerts only for critical events
if (errorRate > 0.05) {
  await client.mcp.execute({
    connector: 'slack_workspace',
    action: 'send_message',
    statement: '#incidents',
    parameters: {
      text: `⚠️ Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}%`
    }
  });
}
```

---

## Common Use Cases

### 1. Deployment Notifications

```typescript
async function notifyDeployment(version: string, status: 'success' | 'failed') {
  const emoji = status === 'success' ? '✅' : '❌';
  const message = `${emoji} Deployment ${version} ${status}`;

  await client.mcp.execute({
    connector: 'slack_workspace',
    action: 'send_message',
    statement: '#deployments',
    parameters: { text: message }
  });
}
```

### 2. Customer Support Alerts

```typescript
async function alertSupport(ticketId: string, priority: string) {
  await client.mcp.execute({
    connector: 'slack_workspace',
    action: 'send_message',
    statement: '#support',
    parameters: {
      text: `New ${priority} priority ticket: #${ticketId}`,
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Ticket #${ticketId}*\nPriority: ${priority}\n<https://support.example.com/tickets/${ticketId}|View Ticket>`
        }
      }]
    }
  });
}
```

### 3. Policy Violation Notifications

```typescript
async function notifyPolicyViolation(userId: string, policyName: string) {
  await client.mcp.execute({
    connector: 'slack_workspace',
    action: 'send_message',
    statement: '#security',
    parameters: {
      text: `🔒 Policy violation detected: ${policyName} by user ${userId}`
    }
  });
}
```

---

## Troubleshooting

### Bot Not in Channel

**Error:** `not_in_channel`

**Solution:** Invite the bot to your channel:
```
/invite @AxonFlow
```

### Permission Denied

**Error:** `missing_scope`

**Solution:** Add required OAuth scopes to your Slack app:
1. Go to your app settings
2. Navigate to "OAuth & Permissions"
3. Add missing scopes
4. Reinstall the app

### Rate Limiting

**Error:** `rate_limited`

Slack limits: 1 request per second per method.

**Solution:** Implement retry logic with exponential backoff:
```typescript
import { retry } from '@axonflow/sdk';

const result = await retry(() =>
  client.mcp.execute({
    connector: 'slack_workspace',
    action: 'send_message',
    statement: '#channel',
    parameters: { text: 'Message' }
  }),
  {
    maxRetries: 3,
    delayMs: 1000,
    exponentialBackoff: true
  }
);
```

---

## API Reference

### Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `send_message` | Send message to channel | `text`, `blocks`, `channel` |
| `list_channels` | List workspace channels | `types`, `limit` |
| `get_users` | Get user information | `limit` |
| `search_messages` | Search message history | `query`, `count` |

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

- **Bot Token Security:** Never commit tokens to git. Use environment variables.
- **Channel Permissions:** Bot can only access public channels or channels it's invited to.
- **Tenant Isolation:** AxonFlow enforces multi-tenant isolation for Slack credentials.

---

## Performance

**Typical Latencies:**
- Send message: 100-200ms
- List channels: 50-100ms
- Search messages: 150-300ms

**Rate Limits:**
- Tier 1 methods (chat.postMessage): 1/sec
- Tier 2 methods (users.list): 20/min
- Tier 3 methods (search.messages): 1/min

---

## Related Documentation

- [MCP Overview](/mcp/overview.md)
- [TypeScript SDK](/sdk/typescript.md)
- [Go SDK](/sdk/go.md)

---

**Need Help?** Contact support@getaxonflow.com
