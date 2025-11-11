# Examples Overview

**Complete, runnable examples for common use cases** - Get started quickly with production-ready code.

---

## Available Examples

Browse our collection of production-ready examples. Each example is complete, tested, and ready to deploy.

### Quick Reference

| Example | Industry | Complexity | Features | Time to Deploy |
|---------|----------|------------|----------|----------------|
| [Hello World](#hello-world) | All | Beginner | Basic query + policy | 5 minutes |
| [Healthcare Assistant](#healthcare-assistant) | Healthcare | Advanced | HIPAA, PII, RBAC | 30 minutes |
| [E-commerce Recommendations](#ecommerce-recommendations) | Retail | Intermediate | Product data, personalization | 20 minutes |
| [Customer Support](#customer-support) | Support | Intermediate | Tickets, knowledge base, escalation | 20 minutes |
| [Trip Planner](#trip-planner) | Travel | Advanced | MAP, MCP, LLM integration | 30 minutes |

---

## Hello World

**The simplest AxonFlow example** - Perfect for learning the basics.

### What It Demonstrates
- Basic query execution
- Simple policy enforcement
- Request/response handling
- Audit logging

### Code

**TypeScript (30 lines):**
```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  endpoint: 'https://YOUR_AGENT_ENDPOINT',
  licenseKey: 'YOUR_LICENSE_KEY',
  organizationId: 'my-org'
});

async function main() {
  const response = await client.executeQuery({
    query: 'What is the capital of France?',
    policy: `
      package axonflow.policy
      default allow = true
    `
  });

  console.log('Response:', response.result);
  console.log('Latency:', response.metadata.latency_ms + 'ms');
}

main();
```

**Go (35 lines):**
```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/axonflow/axonflow-go"
)

func main() {
    client, _ := axonflow.NewClient(axonflow.Config{
        Endpoint:       "https://YOUR_AGENT_ENDPOINT",
        LicenseKey:     "YOUR_LICENSE_KEY",
        OrganizationID: "my-org",
    })

    response, err := client.ExecuteQuery(context.Background(), &axonflow.QueryRequest{
        Query: "What is the capital of France?",
        Policy: `
            package axonflow.policy
            default allow = true
        `,
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("Response:", response.Result)
    fmt.Printf("Latency: %dms\n", response.Metadata.LatencyMS)
}
```

### Quick Start

```bash
# Clone example
git clone https://github.com/axonflow/examples
cd examples/hello-world

# TypeScript
cd typescript
npm install
npm start

# Go
cd go
go run main.go
```

### GitHub
📁 [View on GitHub](https://github.com/axonflow/examples/tree/main/hello-world)

---

## Healthcare Assistant

**HIPAA-compliant medical AI assistant** - Production-ready healthcare example.

### What It Demonstrates
- HIPAA compliance patterns
- PII detection and redaction
- Role-based access control (RBAC)
- Patient data access controls
- Multi-agent coordination
- Audit trail for compliance
- HL7/FHIR integration patterns

### Features

**✅ HIPAA Compliance:**
- Encryption at rest and in transit
- Access controls and audit logging
- Minimum necessary rule enforcement
- PHI (Protected Health Information) protection
- Breach notification procedures

**✅ Security:**
- Role-based permissions (Doctor, Nurse, Admin)
- Patient assignment validation
- Business hours enforcement
- Emergency access procedures
- Comprehensive audit trail

**✅ Technical:**
- React frontend with TypeScript
- Go backend with PostgreSQL
- AxonFlow policy enforcement
- Real-time audit logging
- CloudWatch integration

### Use Cases

1. **Patient Records Access**
   - Doctors access assigned patients only
   - Nurses have limited read access
   - Admins have full access with audit trail

2. **Prescription Management**
   - Drug interaction checking
   - Dosage validation
   - Prescription history tracking

3. **Lab Results**
   - Automated result distribution
   - Critical result alerts
   - Access based on patient assignment

4. **Appointment Scheduling**
   - Availability checking
   - Conflict detection
   - Automated reminders

### Architecture

```
┌─────────────┐
│   Frontend  │  React + TypeScript
│  (Patient)  │
└──────┬──────┘
       │
       │ HTTPS
       │
┌──────▼──────┐
│   Backend   │  Go + PostgreSQL
│  (HIPAA)    │
└──────┬──────┘
       │
       │ AxonFlow SDK
       │
┌──────▼──────┐
│  AxonFlow   │  Policy Enforcement
│   Agent     │  Sub-10ms latency
└──────┬──────┘
       │
       │ MCP
       │
┌──────▼──────┐
│  FHIR API   │  Patient data
│  / EHR      │
└─────────────┘
```

### Quick Start

```bash
# Clone repository
git clone https://github.com/axonflow/examples
cd examples/healthcare-assistant

# Setup database
docker-compose up -d postgres

# Run backend
cd backend
go run main.go

# Run frontend
cd frontend
npm install
npm start

# Access at http://localhost:3000
```

### Configuration

**Environment Variables:**
```bash
# AxonFlow
AXONFLOW_ENDPOINT=https://your-agent-endpoint
AXONFLOW_LICENSE_KEY=AXON-V2-xxx-yyy
AXONFLOW_ORG_ID=healthcare-org

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/healthcare

# FHIR Integration (optional)
FHIR_BASE_URL=https://your-fhir-server
FHIR_CLIENT_ID=xxx
FHIR_CLIENT_SECRET=yyy
```

### Policy Example

```rego
package axonflow.policy.healthcare

import future.keywords

# HIPAA minimum necessary rule
allow {
    input.context.user_role in ["doctor", "nurse"]
    is_patient_assigned_to_user(
        input.context.user_id,
        extract_patient_id(input.query)
    )
}

# Emergency access (override with audit)
allow {
    input.context.emergency_access == true
    input.context.emergency_reason != ""
    log_emergency_access
}

# Block access to all patient data (HIPAA violation)
deny["HIPAA violation: minimum necessary rule"] {
    contains(lower(input.query), "all patients")
    input.context.user_role != "admin"
}

# Redact SSN from queries
redacted_query := regex.replace(
    input.query,
    `\b\d{3}-\d{2}-\d{4}\b`,
    "***-**-****"
)
```

### Compliance Checklist

- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Access controls (RBAC)
- ✅ Audit logging (all PHI access)
- ✅ Data retention (6 years)
- ✅ Breach notification procedures
- ✅ Emergency access with audit trail
- ✅ Business Associate Agreement (BAA) with AxonFlow

### GitHub
📁 [View on GitHub](https://github.com/axonflow/examples/tree/main/healthcare-assistant)

### Documentation
📖 [Full Documentation](/docs/examples/healthcare)

---

## E-commerce Recommendations

**AI-powered product recommendation engine** - Increase sales with personalized recommendations.

### What It Demonstrates
- Product catalog integration
- Personalized recommendations
- Inventory management
- Price calculation with policies
- Cart management
- Order processing workflow
- A/B testing for recommendations

### Features

**✅ Recommendations:**
- Collaborative filtering
- Content-based filtering
- Hybrid recommendations
- Real-time personalization
- Trending products

**✅ Business Rules:**
- Dynamic pricing policies
- Inventory constraints
- Discount rules
- Cross-sell/upsell logic
- Geo-specific pricing

**✅ Performance:**
- Sub-10ms recommendation latency
- Real-time inventory checks
- Cached product data
- Batch processing for analytics

### Use Cases

1. **Product Page Recommendations**
   - "Customers who bought this also bought..."
   - "Similar products you might like"
   - "Complete the look"

2. **Cart Recommendations**
   - "Frequently bought together"
   - "Add these items to save more"
   - "Don't forget..."

3. **Personalized Homepage**
   - Based on browsing history
   - Based on purchase history
   - Trending in your area

4. **Email Campaigns**
   - Abandoned cart recovery
   - Product recommendations
   - Back-in-stock alerts

### Architecture

```
┌─────────────┐
│   Storefront│  Next.js / React
│   Frontend  │
└──────┬──────┘
       │
       │ API
       │
┌──────▼──────┐
│ Recommendation│  Node.js / TypeScript
│   Service   │
└──────┬──────┘
       │
       │ AxonFlow SDK
       │
┌──────▼──────┐
│  AxonFlow   │  Policy + Recommendations
│   Agent     │
└──────┬──────┘
       │
       │ MCP
       │
┌──────▼──────┐
│  Product DB │  PostgreSQL / MongoDB
│  (Catalog)  │
└─────────────┘
```

### Quick Start

```bash
cd examples/ecommerce-recommendations

# Setup
npm install
docker-compose up -d

# Run
npm run dev

# Access at http://localhost:3000
```

### Policy Example

```rego
package axonflow.policy.ecommerce

# Dynamic pricing based on user tier
apply_discount {
    input.context.user_tier == "premium"
    input.product.price_with_discount := input.product.price * 0.9
}

apply_discount {
    input.context.user_tier == "gold"
    input.product.price_with_discount := input.product.price * 0.85
}

# Geo-specific pricing
apply_geo_pricing {
    input.context.country == "US"
    input.product.price_usd := input.product.base_price
}

apply_geo_pricing {
    input.context.country == "EU"
    input.product.price_eur := input.product.base_price * 0.92
}

# Block out-of-stock recommendations
deny["Product out of stock"] {
    input.product.inventory_count <= 0
}
```

### GitHub
📁 [View on GitHub](https://github.com/axonflow/examples/tree/main/ecommerce-recommendations)

### Documentation
📖 [Full Documentation](/docs/examples/ecommerce)

---

## Customer Support

**Automated AI support agent** - Reduce support costs and improve response times.

### What It Demonstrates
- Ticket creation and management
- Knowledge base search
- Escalation workflows
- Multi-language support
- Sentiment analysis
- Auto-categorization
- Slack/Email integration

### Features

**✅ Automation:**
- Auto-categorize tickets
- Suggest responses
- Auto-resolve common issues
- Escalate complex issues
- Route to right team

**✅ Integration:**
- Zendesk connector
- Salesforce Service Cloud
- Slack notifications
- Email automation
- SMS (Twilio)

**✅ Intelligence:**
- Sentiment analysis
- Intent detection
- Entity extraction
- Language detection
- Context awareness

### Use Cases

1. **First-Line Support**
   - Answer common questions
   - Password resets
   - Account inquiries
   - Product information

2. **Ticket Routing**
   - Auto-categorize by topic
   - Route to specialized teams
   - Prioritize by sentiment/urgency
   - Escalate VIP customers

3. **Knowledge Base**
   - Search internal docs
   - Find relevant articles
   - Suggest solutions
   - Learn from resolutions

4. **Multi-Channel Support**
   - Email tickets
   - Chat messages
   - Slack inquiries
   - Social media mentions

### Architecture

```
┌─────────────┐
│   Customer  │  Web / Mobile / Email
│   Channels  │
└──────┬──────┘
       │
       │ API
       │
┌──────▼──────┐
│   Support   │  Python / FastAPI
│   Backend   │
└──────┬──────┘
       │
       │ AxonFlow SDK
       │
┌──────▼──────┐
│  AxonFlow   │  NLP + Policy
│   Agent     │
└──────┬──────┘
       │
       │ MCP
       │
┌──────▼──────┐
│  Zendesk /  │  Ticket system
│  Salesforce │
└─────────────┘
```

### Quick Start

```bash
cd examples/customer-support

# Setup
pip install -r requirements.txt
docker-compose up -d

# Run
python main.py

# Access API at http://localhost:8000
```

### Policy Example

```rego
package axonflow.policy.support

# Escalate high-priority issues
escalate {
    input.ticket.sentiment_score < -0.5  # Very negative
    input.ticket.priority := "high"
}

escalate {
    input.ticket.customer_tier == "enterprise"
    input.ticket.priority := "high"
}

# Auto-resolve common issues
auto_resolve {
    input.ticket.category == "password_reset"
    input.ticket.status := "resolved"
    input.ticket.resolution := "Password reset instructions sent"
}

# Route to specialized teams
route_to_team["billing"] {
    input.ticket.category in ["payment", "invoice", "refund"]
}

route_to_team["technical"] {
    input.ticket.category in ["bug", "error", "integration"]
}
```

### GitHub
📁 [View on GitHub](https://github.com/axonflow/examples/tree/main/customer-support)

### Documentation
📖 [Full Documentation](/docs/examples/support)

---

## Trip Planner

**AI-powered travel planning assistant** - Multi-agent coordination with MCP connectors.

### What It Demonstrates
- Multi-Agent Parallel (MAP) execution
- MCP connector integration (Amadeus)
- LLM integration (Claude)
- Real-time flight/hotel search
- Itinerary generation
- Rate limiting patterns
- Service identity & permissions

### Features

**✅ Travel Planning:**
- Flight search (Amadeus API)
- Hotel recommendations
- Activity suggestions
- Weather forecasts
- Restaurant recommendations
- Complete itinerary generation

**✅ Performance:**
- 5x faster with parallel execution
- Sub-10ms policy enforcement
- Real-time availability
- Cached results

**✅ Advanced Patterns:**
- Service-based authentication
- MCP connector permissions
- Rate limiting (100/hour, 500/day)
- Graceful fallback (LLM)
- Multi-agent orchestration

### Use Cases

1. **Complete Trip Planning**
   - Search flights
   - Find hotels
   - Suggest activities
   - Generate itinerary
   - All in single request

2. **Budget Optimization**
   - Compare flight prices
   - Find best hotel deals
   - Optimize for budget
   - Suggest alternatives

3. **Multi-City Trips**
   - Complex routing
   - Multiple destinations
   - Optimized connections
   - Time zone handling

### Architecture

```
┌─────────────┐
│   Frontend  │  React + TypeScript
│   (User)    │
└──────┬──────┘
       │
       │ HTTPS
       │
┌──────▼──────┐
│   Backend   │  Go + PostgreSQL
│   (API)     │
└──────┬──────┘
       │
       │ AxonFlow SDK (Service License)
       │
┌──────▼──────┐
│  AxonFlow   │  MAP Orchestration
│   Agent     │
└──────┬──────┴──────┬────────┐
       │             │        │
┌──────▼──────┐ ┌────▼────┐ ┌▼────────┐
│   Amadeus   │ │  Claude │ │ Weather │
│     MCP     │ │   LLM   │ │   MCP   │
└─────────────┘ └─────────┘ └─────────┘
```

### Quick Start

```bash
cd examples/trip-planner

# Setup backend
cd backend
go mod download
go run main.go

# Setup frontend
cd frontend
npm install
npm run dev

# Access at http://localhost:3000
```

### Service License Configuration

```typescript
// Service identity with MCP permissions
const client = new AxonFlowClient({
  endpoint: process.env.AXONFLOW_ENDPOINT,
  licenseKey: process.env.SERVICE_LICENSE_KEY,  // Service-specific key
  organizationId: 'travel-agency',
  serviceIdentity: {
    name: 'trip-planner',
    type: 'backend-service',
    permissions: [
      'mcp:amadeus:search_flights',
      'mcp:amadeus:search_hotels',
      'mcp:amadeus:lookup_airport'
    ]
  }
});
```

### Policy Example

```rego
package axonflow.policy.travel

# Allow service to access Amadeus API
allow {
    input.service.name == "trip-planner"
    input.service.permissions[_] == sprintf("mcp:amadeus:%s", [input.mcp.operation])
}

# Enforce rate limiting
deny["Rate limit exceeded"] {
    request_count := count_requests_last_hour(input.service.name)
    request_count > 100
}

# Budget validation
deny["Budget too low"] {
    input.budget < 100
    input.budget_type == "total"
}
```

### Performance

**Sequential Execution (traditional):**
```
Flight search: 5s
Hotel search: 5s
Activities: 8s
Weather: 3s
Restaurants: 8s
Total: 29 seconds
```

**Parallel Execution (MAP):**
```
All 5 queries in parallel: 8s (max of all)
Speedup: 3.6x
```

### GitHub
📁 [View on GitHub](https://github.com/axonflow/examples/tree/main/trip-planner)

### Documentation
📖 [Full Documentation](/docs/examples/trip-planner)

---

## Choosing the Right Example

### By Industry

| Industry | Recommended Example | Key Features |
|----------|-------------------|--------------|
| Healthcare | Healthcare Assistant | HIPAA, PII protection, RBAC |
| Retail/E-commerce | E-commerce Recommendations | Personalization, inventory, pricing |
| SaaS/Tech | Customer Support | Ticket automation, knowledge base |
| Travel | Trip Planner | MAP, MCP connectors, LLM |
| Finance | Healthcare Assistant (adapt) | Compliance, audit trail, access control |

### By Complexity

**Beginner:** Start with Hello World, then try E-commerce or Customer Support

**Intermediate:** E-commerce Recommendations or Customer Support

**Advanced:** Healthcare Assistant or Trip Planner (multi-agent, MCP)

### By Features

**Need MCP Connectors?** → Trip Planner or Healthcare Assistant

**Need Multi-Agent (MAP)?** → Trip Planner

**Need HIPAA Compliance?** → Healthcare Assistant

**Need LLM Integration?** → Trip Planner or Customer Support

---

## Running Examples Locally

### Prerequisites

All examples require:
1. AxonFlow deployed (see [Getting Started](/docs/getting-started))
2. License key (from CloudFormation outputs)
3. Node.js 18+ or Go 1.21+

### General Steps

```bash
# 1. Clone repository
git clone https://github.com/axonflow/examples
cd examples/[example-name]

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Install dependencies
npm install  # or go mod download

# 4. Run
npm start    # or go run main.go
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](https://github.com/axonflow/examples/blob/main/CONTRIBUTING.md)

### Adding a New Example

1. Follow existing structure
2. Include README with setup instructions
3. Add .env.example file
4. Include sample policies
5. Add tests
6. Update this overview page

---

## Support

**Questions about examples?**

- **Email:** support@getaxonflow.com
- **GitHub Issues:** https://github.com/axonflow/examples/issues
- **Documentation:** https://docs.getaxonflow.com

---

**All examples tested with AxonFlow v1.0.12** - Last updated: November 11, 2025
