# License Management

Learn how AxonFlow licensing works, how to activate your license, and manage node limits for In-VPC deployments.

## Overview

AxonFlow In-VPC deployments use license keys to enforce tier limits and feature access. Your license key is provided by the AxonFlow sales team after purchase or automatically via AWS Marketplace.

**License Tiers:**
- **Professional**: Up to 10 nodes, standard features
- **Enterprise**: Up to 50 nodes, advanced features + SLA
- **Enterprise Plus**: Unlimited nodes, premium support

**Node Definition:** Total count of Agent + Orchestrator containers

## Getting Your License Key

### AWS Marketplace Purchase

If you purchased AxonFlow via AWS Marketplace:

1. After subscribing, AWS sends a welcome email with your license key
2. Alternatively, find it in **AWS Marketplace Subscriptions** → **Manage** → **License Details**
3. Format: `AXON-{TIER}-{ORG}-{EXPIRY}-{SIGNATURE}`

**Example:**
```
AXON-ENT-acme-20261028-3c282532
```

### Direct Purchase

If you purchased directly from AxonFlow:

1. You'll receive an email titled "Your AxonFlow License Key"
2. The email contains your license key and tier details
3. Contact `support@getaxonflow.com` if you didn't receive it

## Activating Your License

### During CloudFormation Deployment

The license key is set as a CloudFormation parameter during deployment:

1. In the CloudFormation stack parameters, locate **LicenseKey**
2. Paste your full license key (e.g., `AXON-ENT-acme-20261028-3c282532`)
3. Complete the stack deployment

The license is automatically validated when agents and orchestrators start.

### After Deployment (Updating License)

If you need to update your license (renewal or upgrade):

#### Option 1: Update CloudFormation Stack

1. Go to **CloudFormation** → Your Stack → **Update**
2. Choose **Use current template**
3. Update the **LicenseKey** parameter
4. Confirm and wait for stack update
5. ECS tasks will automatically restart with new license

#### Option 2: Update Environment Variable Manually

For immediate updates without CloudFormation:

```bash
# Update Agent task definition
aws ecs describe-task-definition --task-definition axonflow-agent > agent-task.json
# Edit agent-task.json: Update environment variable AXONFLOW_LICENSE_KEY
aws ecs register-task-definition --cli-input-json file://agent-task.json

# Force service update to use new task definition
aws ecs update-service --cluster axonflow-cluster \
  --service axonflow-agent-service --force-new-deployment

# Repeat for orchestrator
aws ecs describe-task-definition --task-definition axonflow-orchestrator > orchestrator-task.json
# Edit orchestrator-task.json: Update environment variable AXONFLOW_LICENSE_KEY
aws ecs register-task-definition --cli-input-json file://orchestrator-task.json

aws ecs update-service --cluster axonflow-cluster \
  --service axonflow-orchestrator-service --force-new-deployment
```

## License Features by Tier

### Professional Tier

**Node Limit:** 10 nodes
**Estimated Capacity:** ~100K requests/day

**Included Features:**
- ✅ Basic policy enforcement
- ✅ Audit logging
- ✅ Standard connectors (HTTP REST, Redis)
- ✅ Community support (email, 48-hour response)
- ✅ Quarterly releases

**Upgrade Path:** Easily upgrade to Enterprise for more nodes and features

---

### Enterprise Tier

**Node Limit:** 50 nodes
**Estimated Capacity:** ~500K requests/day

**Includes All Professional Features, Plus:**
- ✅ Multi-tenant support
- ✅ Advanced governance policies
- ✅ 99.9% SLA guarantee
- ✅ Priority support (4-hour response time)
- ✅ Custom connectors
- ✅ Monthly releases
- ✅ Dedicated customer success manager

**Best For:** Growing companies with complex governance needs

---

### Enterprise Plus Tier

**Node Limit:** Unlimited
**Estimated Capacity:** Millions of requests/day

**Includes All Enterprise Features, Plus:**
- ✅ Unlimited node scaling
- ✅ 24x7 premium support (1-hour response time)
- ✅ Dedicated Solutions Architect
- ✅ Custom feature development
- ✅ On-demand releases
- ✅ Architecture review sessions

**Best For:** Large enterprises with mission-critical AI workloads

## Managing Node Count

### Viewing Active Nodes

Check your current node count via the health endpoint:

```bash
# Query Agent health endpoint
curl -s https://YOUR_ALB_DNS/health | jq '.node_count'

# Output example:
# {
#   "active_agents": 5,
#   "active_orchestrators": 3,
#   "total_nodes": 8,
#   "license_max_nodes": 10,
#   "nodes_remaining": 2
# }
```

### Scaling Within License Limits

**Scaling Up Agents:**

```bash
aws ecs update-service --cluster axonflow-cluster \
  --service axonflow-agent-service \
  --desired-count 5
```

**Scaling Up Orchestrators:**

```bash
aws ecs update-service --cluster axonflow-cluster \
  --service axonflow-orchestrator-service \
  --desired-count 3
```

**Important:** Total nodes (agents + orchestrators) must not exceed your license limit.

### Node Limit Alerts

AxonFlow automatically monitors node count and sends alerts if you exceed your license limit:

- **Warning at 90%:** Email to registered admin
- **Critical at 100%:** Email + CloudWatch alarm
- **Grace Period:** 7 days to upgrade license or reduce nodes

**Example Alert:**
```
Subject: AxonFlow Node Limit Warning (9/10 nodes)

Your AxonFlow deployment is using 9 out of 10 licensed nodes.

Current Node Count:
- Agents: 6
- Orchestrators: 3
- Total: 9/10 (90%)

Actions:
1. Upgrade to Enterprise tier (50 nodes) - Contact sales
2. Reduce node count to stay within limit

Your AxonFlow Team
```

## License Renewal

### Renewal Timeline

- **90 days before expiry:** Renewal notification email
- **60 days before expiry:** Second reminder
- **30 days before expiry:** Final reminder with escalation
- **Expiry date + 7 days:** Grace period ends

### Renewal Process

1. **Automatic (AWS Marketplace):**
   - AWS auto-renews subscription if enabled
   - New license key emailed automatically
   - Update CloudFormation stack with new key

2. **Manual (Direct Purchase):**
   - Contact Customer Success or sales
   - Receive renewed license key via email
   - Update CloudFormation stack with new key

### Grace Period

After license expiry, you have a **7-day grace period** before enforcement:

- Days 1-7: System continues working, daily warning emails
- Day 8+: Agents reject new requests (existing requests complete)

**To avoid disruption:** Update your license before grace period ends.

## Upgrading Your License

### Professional → Enterprise

**Why Upgrade:**
- Need more than 10 nodes
- Require advanced policies or custom connectors
- Want priority support and SLA

**Process:**
1. Contact `sales@getaxonflow.com` or your account manager
2. Discuss pricing and transition timeline
3. Receive new Enterprise license key
4. Update CloudFormation stack with new key
5. **Zero downtime:** Agents restart with new license

**Pricing:** Pro-rated credit for remaining Professional term

### Enterprise → Enterprise Plus

**Why Upgrade:**
- Need to scale beyond 50 nodes
- Require 24x7 support
- Want dedicated Solutions Architect

**Process:**
1. Contact your account manager
2. Architect reviews your infrastructure needs
3. Custom pricing quote based on scale
4. Receive new Enterprise Plus license key
5. Update CloudFormation stack

## Troubleshooting

### "Invalid license key" Error

**Symptoms:** Agents fail to start, logs show "License validation failed"

**Causes:**
1. Typo in license key
2. License key expired
3. Wrong tier for your deployment

**Solutions:**
```bash
# Verify license format (should be AXON-{TIER}-{ORG}-{DATE}-{SIG})
echo $AXONFLOW_LICENSE_KEY

# Check for extra spaces or newlines
echo "$AXONFLOW_LICENSE_KEY" | xxd

# Verify expiry date (8th-15th characters after last hyphen)
# Example: AXON-ENT-acme-20261028-3c282532
#                           ^^^^^^^^ = 2026-10-28
```

**Fix:** Update the CloudFormation stack with the correct license key.

### "Node limit exceeded" Error

**Symptoms:** New containers fail to start, error message "Maximum nodes reached"

**Causes:**
- Scaled beyond license limit (e.g., 11 nodes on Professional tier)
- Stale heartbeats from terminated containers

**Solutions:**

1. **Check current node count:**
   ```bash
   curl -s https://YOUR_ALB_DNS/health | jq '.total_nodes'
   ```

2. **Reduce to within limit:**
   ```bash
   # Scale down to fit within license
   aws ecs update-service --cluster axonflow-cluster \
     --service axonflow-agent-service --desired-count 6
   ```

3. **Or upgrade license tier:**
   - Contact sales to upgrade
   - Receive new license key
   - Update CloudFormation stack

### License Key Not Recognized After Update

**Symptoms:** Updated license key but agents still show old tier

**Cause:** ECS tasks haven't restarted with new environment variable

**Solution:**

```bash
# Force restart of all agent tasks
aws ecs update-service --cluster axonflow-cluster \
  --service axonflow-agent-service --force-new-deployment

# Force restart of all orchestrator tasks
aws ecs update-service --cluster axonflow-cluster \
  --service axonflow-orchestrator-service --force-new-deployment

# Wait 5 minutes for new tasks to start
# Verify new license is active
curl -s https://YOUR_ALB_DNS/health | jq '.license_tier'
```

## Security Best Practices

### Storing License Keys

**✅ Recommended:**
- Store in AWS Secrets Manager
- Reference via CloudFormation parameter
- Limit IAM access to secrets

**❌ Avoid:**
- Hardcoding in application code
- Storing in plain text files
- Committing to git repositories
- Sharing via unencrypted channels

### AWS Secrets Manager Integration

Store your license key securely:

```bash
# Create secret
aws secretsmanager create-secret \
  --name axonflow/license-key \
  --description "AxonFlow license key for production" \
  --secret-string "AXON-ENT-acme-20261028-3c282532"

# Update CloudFormation to reference secret
# In your task definition, use:
# ValueFrom: arn:aws:secretsmanager:REGION:ACCOUNT:secret:axonflow/license-key
```

### Rotating License Keys

When renewing or upgrading:

1. Generate new license key (via sales or AWS Marketplace)
2. Update secret in Secrets Manager
3. Force ECS service deployment
4. Verify new license is active
5. Archive old license key (don't delete immediately)
6. Monitor for 24 hours to ensure smooth transition

## Support

### License-Related Support

**Email:** `licensing@getaxonflow.com`
**Response Time:**
- Professional: 48 hours
- Enterprise: 4 hours
- Enterprise Plus: 1 hour

**Common Requests:**
- License renewal
- Tier upgrades
- Node limit increase
- Multi-region licensing

### Emergency License Issues

If production is down due to license issues:

1. **Professional tier:** Email `support@getaxonflow.com` with subject "URGENT: License Issue"
2. **Enterprise/Plus:** Call your dedicated support line (provided in welcome email)
3. **Grace period:** Emergency licenses available within 2 hours

## FAQ

### Q: Can I transfer my license to a different AWS account?

**A:** Yes, contact `licensing@getaxonflow.com` with:
- Current AWS account ID
- New AWS account ID
- Reason for transfer
- New license key will be issued within 24 hours

### Q: Does node count include database or load balancers?

**A:** No, node count only includes Agent and Orchestrator ECS tasks. Supporting infrastructure (RDS, ALB, etc.) does not count toward your limit.

### Q: Can I use one license across multiple regions?

**A:** No, each region requires a separate license. Contact sales for multi-region pricing.

### Q: What happens if my license expires?

**A:** 7-day grace period with daily warning emails. After grace period, agents reject new requests but existing requests complete normally. Update license to restore full functionality.

### Q: Can I test AxonFlow without a license?

**A:** Yes! Request a 90-day Professional trial license: `sales@getaxonflow.com`

---

**Related Documentation:**
- [AWS Marketplace Deployment](./aws-marketplace.md)
- [SDK Authentication](../sdk/authentication.md)
- [Post-Deployment Configuration](./post-deployment.md)
