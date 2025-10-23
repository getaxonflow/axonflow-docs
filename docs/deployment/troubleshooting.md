# Troubleshooting

Common issues and solutions for AxonFlow deployment and operation.

## Deployment Issues

### Issue: Tasks Not Starting

**Symptoms:**
- ECS tasks stuck in PENDING state
- Services showing 0 running tasks
- CloudFormation stack creation hangs

**Possible Causes:**

1. **Insufficient subnet capacity**
   - Private subnets too small for RDS + ECS tasks
   - **Solution**: Use /24 subnets (256 IPs minimum)

2. **No NAT Gateway**
   - Tasks can't pull images from ECR
   - **Check**: Do private subnets have route to NAT Gateway?
   - **Solution**: Add NAT Gateway or use VPC endpoints for ECR

3. **Security group misconfiguration**
   - Tasks can't communicate
   - **Check**: Security group rules allow required ports
   - **Solution**: Verify Agent→Orchestrator (8081), Agent→RDS (5432)

**Debug Steps:**

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster YOUR_CLUSTER \
  --services agent-service \
  --query 'services[0].events[0:5]'

# Check task stopped reason
aws ecs describe-tasks \
  --cluster YOUR_CLUSTER \
  --tasks TASK_ARN \
  --query 'tasks[0].stoppedReason'
```

### Issue: Health Check Failing

**Symptoms:**
- `/health` endpoint returns 500
- CloudFormation stack rollback
- ALB shows 0 healthy targets

**Possible Causes:**

1. **Database not accessible**
   - **Check**: Can Agent reach RDS endpoint?
   - **Solution**: Verify security group allows inbound 5432 from Agent SG

2. **Database credentials invalid**
   - **Check**: Is DATABASE_URL environment variable correct?
   - **Solution**: Verify password in Secrets Manager matches RDS

3. **Orchestrator not reachable**
   - **Check**: Can Agent reach Orchestrator on port 8081?
   - **Solution**: Verify Orchestrator service is running

**Debug Steps:**

```bash
# Test database connectivity
curl https://YOUR_AGENT_ENDPOINT/health/db

# Check CloudWatch logs
aws logs tail /ecs/YOUR_STACK/agent --follow

# Test from within VPC
aws ecs execute-command \
  --cluster YOUR_CLUSTER \
  --task TASK_ARN \
  --container agent \
  --interactive \
  --command "/bin/sh"
```

## Performance Issues

### Issue: High Latency (>10ms P95)

**Symptoms:**
- Policy evaluation taking >10ms P95
- Slow agent responses
- Timeouts under load

**Possible Causes:**

1. **Insufficient Agent capacity**
   - Too few Agent tasks for load
   - **Solution**: Increase `AgentDesiredCount` parameter

2. **Database performance**
   - RDS instance too small
   - High database latency
   - **Check**: Monitor RDS CloudWatch metrics
   - **Solution**: Upgrade to larger instance class

3. **Network latency**
   - Cross-AZ latency
   - VPC routing issues
   - **Check**: Measure network latency
   - **Solution**: Review VPC configuration

**Debug Steps:**

```bash
# Check Agent CPU/memory
aws ecs describe-services \
  --cluster YOUR_CLUSTER \
  --services agent-service \
  --query 'services[0].deployments[0].runningCount'

# Check database performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ReadLatency \
  --dimensions Name=DBInstanceIdentifier,Value=YOUR_DB \
  --start-time 2025-10-23T00:00:00Z \
  --end-time 2025-10-23T23:59:59Z \
  --period 300 \
  --statistics Average

# Load test
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/agent/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"task": "test"}' \
  -w "\nTime: %{time_total}s\n"
```

**Solutions:**

1. **Scale up Agents**:
   ```bash
   aws ecs update-service \
     --cluster YOUR_CLUSTER \
     --service agent-service \
     --desired-count 10
   ```

2. **Upgrade database**:
   ```bash
   aws rds modify-db-instance \
     --db-instance-identifier YOUR_DB \
     --db-instance-class db.t3.large \
     --apply-immediately
   ```

3. **Enable HTTP/2** (if not already):
   - Verify ALB target group uses `ProtocolVersion: HTTP2`

### Issue: Auto-Scaling Not Working

**Symptoms:**
- Service doesn't scale despite high CPU
- Desired count not changing

**Possible Causes:**

1. **No auto-scaling target**
   - **Check**: Is auto-scaling policy attached?
   - **Solution**: Verify CloudFormation created scaling policy

2. **CPU not reaching threshold**
   - Target is 70%, CPU at 65%
   - **Solution**: Lower threshold or increase load

**Debug Steps:**

```bash
# Check scaling policy
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/YOUR_CLUSTER/agent-service

# Check scaling activities
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/YOUR_CLUSTER/agent-service
```

## Database Issues

### Issue: Database Connection Errors

**Symptoms:**
- "Unable to connect to database"
- Agent health check shows "database": "disconnected"

**Possible Causes:**

1. **Incorrect connection string**
   - **Check**: DATABASE_URL environment variable
   - **Solution**: Verify format: `postgresql://user:pass@host:5432/dbname?sslmode=require`

2. **Security group blocking**
   - **Check**: RDS security group inbound rules
   - **Solution**: Allow port 5432 from Agent security group

3. **RDS not accessible from private subnet**
   - **Check**: RDS subnet group includes private subnets
   - **Solution**: Verify RDS deployed in correct subnets

**Debug Steps:**

```bash
# Test direct connection
psql -h YOUR_DB_ENDPOINT -U axonflow -d axonflow -c "SELECT version();"

# Check security groups
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissions'

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier YOUR_DB \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address}'
```

### Issue: Database Out of Connections

**Symptoms:**
- "too many connections" errors
- Intermittent database failures

**Possible Causes:**
- Connection pool exhausted
- Too many Agent tasks for database capacity

**Solutions:**

1. **Increase max_connections**:
   ```sql
   ALTER SYSTEM SET max_connections = 400;
   SELECT pg_reload_conf();
   ```

2. **Reduce Agent count**:
   ```bash
   aws ecs update-service \
     --cluster YOUR_CLUSTER \
     --service agent-service \
     --desired-count 5
   ```

3. **Upgrade database instance**:
   - Larger instances support more connections
   - db.t3.medium = ~400 connections
   - db.t3.large = ~800 connections

## Policy Issues

### Issue: Policy Not Enforcing

**Symptoms:**
- Requests not being blocked
- Policy rules not applying

**Possible Causes:**

1. **Policy disabled**
   - **Check**: `spec.enabled` is true
   - **Solution**: Enable policy

2. **Priority too low**
   - Earlier policy allowing request
   - **Solution**: Increase priority or check other policies

3. **Conditions not matching**
   - Request doesn't match policy conditions
   - **Solution**: Use policy simulation to debug

**Debug Steps:**

```bash
# Simulate policy evaluation
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/policies/simulate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "user_id": "test@company.com",
    "resource": "database:customers:read",
    "action": "read"
  }'

# Check policy is active
curl https://YOUR_AGENT_ENDPOINT/api/v1/policies/pol_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Issue: Policy Evaluation Too Slow

**Symptoms:**
- Policy latency >10ms
- Timeout errors

**Possible Causes:**
- Too many policies (>50)
- Complex regex patterns
- Large policy files

**Solutions:**

1. **Optimize policies**:
   - Use simple string matching instead of regex
   - Combine related rules
   - Remove unused policies

2. **Increase priority** of frequently-matched policies:
   - Higher priority = evaluated earlier

3. **Use caching**:
   - Enable policy result caching (if available)

## Connector Issues

### Issue: Connector Health Check Failing

**Symptoms:**
- Connector status: "unhealthy"
- Agent can't access data source

**Possible Causes:**

1. **Credentials invalid**
   - **Check**: Secrets Manager contains correct credentials
   - **Solution**: Update secret and restart Agent

2. **Network connectivity**
   - Data source not reachable
   - **Solution**: Check security groups and routing

3. **Permissions insufficient**
   - Connector can't perform required operations
   - **Solution**: Grant necessary permissions

**Debug Steps:**

```bash
# Check connector health
curl https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123/health \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test connector
curl -X POST https://YOUR_AGENT_ENDPOINT/api/v1/connectors/conn_abc123/test \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Monitoring Issues

### Issue: Metrics Not Appearing in CloudWatch

**Symptoms:**
- CloudWatch dashboard empty
- No metrics in namespace

**Possible Causes:**

1. **IAM permissions**
   - Task role missing CloudWatch permissions
   - **Solution**: Add `cloudwatch:PutMetricData` permission

2. **Metrics not enabled**
   - Agent not configured to send metrics
   - **Solution**: Check Agent environment variables

**Debug Steps:**

```bash
# Check IAM role permissions
aws iam get-role-policy \
  --role-name YOUR_TASK_ROLE \
  --policy-name AxonFlowTaskPolicy

# Manually put metric to test
aws cloudwatch put-metric-data \
  --namespace AxonFlow \
  --metric-name test_metric \
  --value 1
```

## Network Issues

### Issue: Cannot Access Agent Endpoint

**Symptoms:**
- Connection timeout
- No route to host

**Possible Causes:**

1. **Internal ALB**
   - ALB is internal (in-VPC only)
   - **Solution**: Access from within VPC or use VPN/bastion

2. **Security group blocking**
   - ALB security group doesn't allow your IP
   - **Solution**: Add inbound rule for your IP

3. **Wrong endpoint**
   - Using incorrect URL
   - **Solution**: Get endpoint from CloudFormation outputs

**Debug Steps:**

```bash
# Check from EC2 instance in same VPC
ssh -i key.pem ubuntu@ec2-in-vpc
curl https://AGENT_ENDPOINT/health

# Check ALB status
aws elbv2 describe-load-balancers \
  --names YOUR_ALB_NAME

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn YOUR_TARGET_GROUP_ARN
```

## Getting Help

### Collect Debug Information

Before contacting support, collect:

1. **CloudFormation stack events**:
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name YOUR_STACK \
     --max-items 50 > stack-events.json
   ```

2. **ECS service description**:
   ```bash
   aws ecs describe-services \
     --cluster YOUR_CLUSTER \
     --services agent-service orchestrator-service \
     > ecs-services.json
   ```

3. **CloudWatch logs** (last 1 hour):
   ```bash
   aws logs filter-log-events \
     --log-group-name /ecs/YOUR_STACK/agent \
     --start-time $(date -u -d '1 hour ago' +%s)000 \
     > agent-logs.txt
   ```

4. **Recent metrics**:
   ```bash
   curl https://YOUR_AGENT_ENDPOINT/api/v1/metrics \
     -H "Authorization: Bearer YOUR_API_KEY" \
     > metrics.json
   ```

### Contact Support

**Email**: support@getaxonflow.com

**Include:**
- Stack name and region
- Issue description and symptoms
- Debug information collected above
- CloudFormation template parameters (redact sensitive values)

**Response Times:**
- Pilot: 24 hours
- Growth: 12 hours
- Enterprise: 4 hours (24/7)

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `ResourceInitializationError: unable to pull secrets` | Can't access Secrets Manager | Check task execution role permissions |
| `CannotPullContainerError` | Can't pull ECR image | Add NAT Gateway or ECR VPC endpoint |
| `ECS service AGENT_SERVICE did not stabilize` | Tasks keep failing health checks | Check Agent logs and database connectivity |
| `The specified subnet does not have enough IP addresses` | Subnet full | Use larger subnet (/24) or reduce task count |
| `Policy evaluation timeout` | Policy taking too long | Reduce policy complexity or increase Agent count |

## Next Steps

- [CloudWatch Monitoring](/docs/monitoring/cloudwatch)
- [Performance Tuning](/docs/monitoring/performance-tuning)
- [Architecture Overview](/docs/architecture/overview)
