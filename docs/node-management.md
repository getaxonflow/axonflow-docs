# Node Management & License Limits

## Overview

AxonFlow licenses are based on the number of active **nodes** in your deployment. A node is either an agent or orchestrator instance running in your environment.

Your license tier determines the maximum number of nodes you can run concurrently:
- **PRO:** Up to 10 nodes
- **ENT:** Up to 50 nodes
- **PLUS:** Custom limits (enterprise)

This guide explains how to monitor your node usage and manage license compliance.

---

## Viewing Node Usage

### Customer Portal Dashboard

1. Log in to your Customer Portal at your organization's portal URL
2. Navigate to the **Dashboard** page
3. View the **Node Usage** section

The dashboard displays:
- **Active Agents:** Number of agent instances with recent heartbeats
- **Active Orchestrators:** Number of orchestrator instances with recent heartbeats
- **Total Active Nodes:** Combined count of agents and orchestrators
- **License Limit:** Maximum nodes allowed under your license
- **Usage Percentage:** Current utilization (e.g., 5/10 = 50%)

**Example:**
```
Node Usage: 5 / 10 nodes (50%)
├─ Agents: 3
└─ Orchestrators: 2

Status: OK ✅
```

---

## Understanding Node Status

The portal uses color-coded status indicators to help you stay within your license limits:

### ✅ OK (Green)
- **Threshold:** Below 80% of license limit
- **Meaning:** Healthy usage, no action required
- **Example:** 7 nodes out of 10 allowed (70%)

### ℹ️ CAUTION (Blue)
- **Threshold:** 80-89% of license limit
- **Meaning:** Approaching limit, consider planning capacity
- **Example:** 8-9 nodes out of 10 allowed
- **Recommendation:** Monitor closely, plan for scaling or license upgrade

### ⚠️ WARNING (Yellow)
- **Threshold:** 90-99% of license limit
- **Meaning:** Near limit, take action soon
- **Example:** 9 nodes out of 10 allowed (90%)
- **Recommendation:** Contact support to upgrade license or reduce node count

### 🚨 VIOLATION (Red)
- **Threshold:** 100% or more of license limit
- **Meaning:** License limit exceeded
- **Example:** 11 nodes out of 10 allowed (110%)
- **Action Required:** Immediate remediation needed

---

## What Counts as an Active Node?

A node is considered **active** if it has sent a heartbeat to the platform within the last **5 minutes**.

**Heartbeats are sent automatically** by each agent and orchestrator instance every 2 minutes. If an instance crashes, becomes unreachable, or is shut down gracefully, it will stop sending heartbeats and be removed from the active count within 5 minutes.

**Important:** Only instances deployed with your organization's license key count toward your limit. Central AxonFlow instances managed by our team do not count against your license.

---

## Managing License Compliance

### When You Approach Your Limit

**Option 1: Scale Down**
- Identify and decommission unused or redundant nodes
- Review your deployment to ensure optimal resource utilization
- Temporary nodes from testing or development should be shut down

**Option 2: Upgrade Your License**
- Contact AxonFlow support to upgrade your license tier
- Provide your organization ID and desired node count
- Upgrades are typically processed within 1 business day

### When You Exceed Your Limit

If you exceed your license limit:

1. **You will receive alerts** via configured notification channels (Slack, email)
2. **Existing nodes will continue to operate** - AxonFlow does not automatically shut down nodes
3. **You must take action** to return to compliance:
   - Scale down to within your limit, OR
   - Upgrade your license tier

**Important:** Running above your license limit violates your license agreement. Please remediate promptly or contact support.

---

## Troubleshooting

### Portal Shows Zero Nodes

**Possible causes:**
- Your deployment has not been configured with node enforcement yet
- No agent/orchestrator instances are running
- Instances are not configured with your organization's license key

**Resolution:**
- Verify your deployment includes the `ORG_ID` and `AXONFLOW_LICENSE_KEY` environment variables
- Check that your agent/orchestrator containers are running
- Contact support if the issue persists

### Portal Shows Stale Node Count

**Possible causes:**
- Node recently started/stopped (allow up to 5 minutes for count to update)
- Network connectivity issues between nodes and database

**Resolution:**
- Wait 5 minutes and refresh the page
- Verify your instances have network connectivity
- Contact support if counts remain incorrect after 10 minutes

### Unexpected High Node Count

**Possible causes:**
- Old/zombie containers still running from previous deployments
- Multiple deployments sharing the same license key
- Testing/development instances not properly shut down

**Resolution:**
- List all running containers: `docker ps | grep axonflow`
- Stop unused containers: `docker stop <container-id>`
- Review your deployment scripts to ensure clean shutdowns
- Contact support if you need assistance auditing your deployment

---

## Upgrading Your License

To upgrade your AxonFlow license:

1. **Contact Support**
   - Email: support@getaxonflow.com
   - Subject: "License Upgrade Request - [Your Organization ID]"

2. **Provide Information**
   - Current license tier (PRO, ENT, PLUS)
   - Desired node count
   - Expected growth timeline
   - Use case (production, staging, development)

3. **Receive Updated License**
   - Support will generate a new license key with increased limits
   - You will receive the updated key via secure channel (AWS Secrets Manager or encrypted email)
   - License keys are updated in-place - no redeployment required
   - Changes take effect within 5 minutes

4. **Verify Update**
   - Log in to Customer Portal
   - Check that "License Limit" reflects new maximum
   - Deploy additional nodes as needed

---

## Best Practices

### Capacity Planning

- **Monitor trends:** Check node usage weekly to identify growth patterns
- **Plan ahead:** Request license upgrades before hitting limits
- **Buffer capacity:** Maintain 10-20% headroom for unexpected spikes
- **Separate environments:** Use different licenses for prod/staging/dev

### Deployment Hygiene

- **Clean shutdowns:** Always gracefully stop containers to remove heartbeats
- **Remove old containers:** Run `docker system prune` periodically
- **Tag instances:** Use descriptive instance IDs for easier tracking
- **Document deployments:** Maintain inventory of active nodes

### Cost Optimization

- **Right-size deployments:** Don't over-provision nodes unnecessarily
- **Autoscaling:** Configure orchestration to scale based on load
- **Scheduled scaling:** Scale down non-production environments outside business hours
- **Resource sharing:** Co-locate compatible workloads on shared nodes

---

## FAQ

**Q: Do failed or crashed nodes count against my limit?**
A: No. Only nodes that have sent a heartbeat within the last 5 minutes count as active.

**Q: Can I temporarily exceed my limit during deployments?**
A: Yes, rolling deployments may briefly exceed limits as new nodes start before old ones stop. This is acceptable for short periods (less than 5 minutes).

**Q: What happens if I accidentally exceed my limit?**
A: Your existing nodes will continue operating. You'll receive alerts and should remediate by scaling down or upgrading.

**Q: Can I monitor node usage via API?**
A: Yes. Use the Customer Portal API: `GET /api/v1/nodes/status` (requires authentication). See API documentation for details.

**Q: How often is node count updated?**
A: Node counts are updated in real-time based on heartbeats every 2 minutes. The portal reflects the current state within 5 minutes.

**Q: Can I set up custom alerts for node usage?**
A: Not currently via the portal UI. Contact support to configure Slack/email alerts for specific thresholds.

**Q: What if my license expires?**
A: Expired licenses will prevent new nodes from starting but won't stop existing nodes. Renew promptly to avoid service disruption.

---

## Getting Help

- **Documentation:** https://docs.getaxonflow.com
- **Support Email:** support@getaxonflow.com
- **Customer Portal:** Access via your organization's portal URL
- **Status Page:** https://status.getaxonflow.com (service incidents)

For urgent license issues, contact support immediately.

---

**Last Updated:** November 3, 2025
**Applies to:** AxonFlow v1.0+
**License Types:** PRO, ENT, PLUS
