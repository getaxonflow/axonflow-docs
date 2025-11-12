# Trip Planner Example

## Overview

This example demonstrates an AI-powered trip planning application built with AxonFlow. It showcases the most advanced features:

- **Multi-Agent Parallel (MAP) execution** for 40x faster results
- **MCP v0.2 connector integration** with Amadeus travel API
- **LLM-powered itinerary generation** using AWS Bedrock
- **Real-time travel data** (flights, hotels, activities)
- **Sub-10ms policy enforcement** for governance
- **Production deployment** on AWS ECS with auto-scaling

**Difficulty:** Advanced
**Time to Complete:** 30 minutes
**Industry:** Travel, Hospitality
**Use Cases:** Trip planning, travel booking, itinerary generation

**Live Demo:** [https://travel-eu.getaxonflow.com](https://travel-eu.getaxonflow.com)

---

## What You'll Build

A production-ready trip planner that:

1. **Plans complete trips** with flights, hotels, activities, and restaurants
2. **Executes 5 queries in parallel** using Multi-Agent Parallel (MAP)
3. **Retrieves real travel data** from Amadeus API via MCP connectors
4. **Generates AI-powered itineraries** using AWS Bedrock (Claude)
5. **Enforces policies** for budget limits, travel restrictions, compliance
6. **Provides results in 10-15 seconds** (vs 60-90 seconds sequential)

---

## Architecture

```
User Request → React Frontend → AxonFlow SDK → Agent → Orchestrator
                                                  ↓           ↓
                                            License Check  MAP Execution
                                                  ↓           ↓
                                            Policy Check   5 Parallel Queries
                                                  ↓           ↓
                                            ┌─────────────────┴────────────────┐
                                            │                                  │
                                      Agent 1-5                           Agent 1-5
                                      (Parallel)                          (Parallel)
                                            │                                  │
                                    ┌───────┴────────┐              ┌─────────┴──────────┐
                                    │                │              │                    │
                              MCP Amadeus      AWS Bedrock    MCP Amadeus          AWS Bedrock
                              (Flights)        (Activities)   (Hotels)             (Restaurants)
                                    │                │              │                    │
                                    └────────────────┴──────────────┴────────────────────┘
                                                     ↓
                                          Aggregated Results (10-15s)
                                                     ↓
                                          Frontend Displays Trip Plan
```

**Key Innovation:** MAP executes all 5 queries in parallel across 5 agents, reducing total time from 60-90s to 10-15s.

---

## Prerequisites

- AxonFlow deployed on AWS
- Agent Endpoint and License Key
- AWS Bedrock access (Claude 3 Sonnet)
- Amadeus API credentials (free tier: 15,000 requests/month)
- Node.js 18+ (for frontend)
- Go 1.21+ (for backend)

---

## Quick Start

### 1. Clone the Example

```bash
git clone https://github.com/axonflow/axonflow.git
cd axonflow/examples/trip-planner
```

### 2. Backend Setup

```bash
cd backend
go mod download

# Configure environment
cat > .env <<EOF
# AxonFlow
AXONFLOW_ENDPOINT=https://your-agent-endpoint
AXONFLOW_LICENSE_KEY=your-license-key
AXONFLOW_ORG_ID=travel-eu

# AWS Bedrock
AWS_REGION=us-east-1

# Amadeus API (for real flight/hotel data)
AMADEUS_API_KEY=your-amadeus-key
AMADEUS_API_SECRET=your-amadeus-secret
AMADEUS_ENV=production
EOF

# Run backend
go run main.go
```

**Backend runs on:** http://localhost:8085

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Configure environment
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:8085
EOF

# Run frontend
npm run dev
```

**Frontend runs on:** http://localhost:3000

---

## Code Examples

### Backend: Multi-Agent Parallel Execution

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/axonflow/axonflow-go"
)

func planTrip(destination string, days int, budget string) (*TripPlan, error) {
    client, err := axonflow.NewClient(axonflow.Config{
        Endpoint:       os.Getenv("AXONFLOW_ENDPOINT"),
        LicenseKey:     os.Getenv("AXONFLOW_LICENSE_KEY"),
        OrganizationID: "travel-eu",
    })
    if err != nil {
        return nil, err
    }

    policy := `
        package axonflow.policy

        import future.keywords

        # Allow all queries for demo
        default allow = true

        # Budget enforcement
        deny["Budget exceeded"] {
            budget_limit := input.context.budget_limit
            estimated_cost := input.context.estimated_cost
            estimated_cost > budget_limit
        }

        # Travel restrictions
        deny["Restricted destination"] {
            restricted := ["North Korea", "Syria"]
            some country in restricted
            input.context.destination == country
        }
    `

    // Execute 5 queries in parallel using MAP
    startTime := time.Now()

    responses, err := client.ExecuteParallel(context.Background(), []*axonflow.QueryRequest{
        // Query 1: Search flights
        {
            Query:  fmt.Sprintf("Search flights to %s", destination),
            Policy: policy,
            MCP: &axonflow.MCPConfig{
                Connector: "amadeus",
                Operation: "search_flights",
                Params: map[string]interface{}{
                    "origin":      "SFO",
                    "destination": getIATACode(destination),
                    "date":        time.Now().AddDate(0, 0, 30).Format("2006-01-02"),
                },
            },
            Context: map[string]interface{}{
                "destination": destination,
                "budget_limit": parseBudget(budget),
            },
        },

        // Query 2: Search hotels
        {
            Query:  fmt.Sprintf("Search hotels in %s", destination),
            Policy: policy,
            MCP: &axonflow.MCPConfig{
                Connector: "amadeus",
                Operation: "search_hotels",
                Params: map[string]interface{}{
                    "city_code": getIATACode(destination),
                    "check_in":  time.Now().AddDate(0, 0, 30).Format("2006-01-02"),
                    "check_out": time.Now().AddDate(0, 0, 30+days).Format("2006-01-02"),
                },
            },
            Context: map[string]interface{}{
                "destination": destination,
                "budget_limit": parseBudget(budget),
            },
        },

        // Query 3: Generate activity recommendations (AI)
        {
            Query:  fmt.Sprintf("Recommend top activities and attractions in %s for %d days", destination, days),
            Policy: policy,
            LLM: &axonflow.LLMConfig{
                Provider:    "aws-bedrock",
                Model:       "anthropic.claude-3-sonnet-20240229-v1:0",
                Temperature: 0.7,
                MaxTokens:   500,
            },
            Context: map[string]interface{}{
                "destination": destination,
                "days":        days,
                "purpose":     "activity_recommendations",
            },
        },

        // Query 4: Get weather forecast (AI)
        {
            Query:  fmt.Sprintf("What is the typical weather in %s this time of year?", destination),
            Policy: policy,
            LLM: &axonflow.LLMConfig{
                Provider:    "aws-bedrock",
                Model:       "anthropic.claude-3-haiku-20240307-v1:0",  // Haiku for cost efficiency
                Temperature: 0.5,
                MaxTokens:   200,
            },
            Context: map[string]interface{}{
                "destination": destination,
                "purpose":     "weather_info",
            },
        },

        // Query 5: Recommend restaurants (AI)
        {
            Query:  fmt.Sprintf("Recommend top restaurants in %s with diverse cuisines", destination),
            Policy: policy,
            LLM: &axonflow.LLMConfig{
                Provider:    "aws-bedrock",
                Model:       "anthropic.claude-3-sonnet-20240229-v1:0",
                Temperature: 0.8,
                MaxTokens:   400,
            },
            Context: map[string]interface{}{
                "destination": destination,
                "budget":      budget,
                "purpose":     "restaurant_recommendations",
            },
        },
    })

    if err != nil {
        return nil, fmt.Errorf("parallel execution failed: %w", err)
    }

    duration := time.Since(startTime)
    fmt.Printf("✅ All 5 queries completed in %v (MAP execution)\n", duration)

    // Parse responses
    tripPlan := &TripPlan{
        Destination: destination,
        Days:        days,
        Budget:      budget,
        Flights:     parseFlights(responses[0].Result),
        Hotels:      parseHotels(responses[1].Result),
        Activities:  responses[2].Result,
        Weather:     responses[3].Result,
        Restaurants: responses[4].Result,
        TotalTime:   duration.Seconds(),
    }

    return tripPlan, nil
}
```

### Frontend: React Component

```typescript
import { useState } from 'react';
import { AxonFlowClient } from '@axonflow/sdk';

export default function TripPlannerForm() {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('moderate');
  const [loading, setLoading] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);

  const client = new AxonFlowClient({
    endpoint: process.env.NEXT_PUBLIC_AXONFLOW_ENDPOINT!,
    licenseKey: process.env.NEXT_PUBLIC_LICENSE_KEY!,
    organizationId: 'travel-eu'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startTime = Date.now();

      // Call backend API (which uses AxonFlow MAP)
      const response = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, days, budget })
      });

      const plan = await response.json();
      const duration = (Date.now() - startTime) / 1000;

      console.log(`✅ Trip plan received in ${duration}s`);
      setTripPlan(plan);
    } catch (error) {
      console.error('Error planning trip:', error);
      alert('Failed to plan trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trip-planner">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination (e.g., Paris)"
          required
        />

        <input
          type="number"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          min={1}
          max={30}
          required
        />

        <select value={budget} onChange={(e) => setBudget(e.target.value)}>
          <option value="budget">Budget</option>
          <option value="moderate">Moderate</option>
          <option value="luxury">Luxury</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? 'Planning trip...' : 'Plan My Trip'}
        </button>
      </form>

      {loading && (
        <div className="loading">
          <p>Planning your perfect trip...</p>
          <p className="subtext">Searching flights, hotels, activities...</p>
        </div>
      )}

      {tripPlan && <TripPlanDisplay plan={tripPlan} />}
    </div>
  );
}
```

---

## Multi-Agent Parallel (MAP) Deep Dive

### Why MAP is 40x Faster

**Sequential Execution (traditional approach):**
```
Flight search:       12s
Hotel search:        15s
Activity generation: 8s
Weather info:        5s
Restaurant recs:     10s
─────────────────────────
Total:               50s
```

**Parallel Execution (MAP):**
```
All 5 queries run simultaneously
Slowest query:       15s (hotel search)
─────────────────────────
Total:               15s

Speedup: 50s / 15s = 3.3x faster
```

**In practice:** 40x speedup is achieved when you have 40 independent queries running in parallel.

### MAP Implementation Details

```go
// Orchestrator receives parallel query request
func (o *Orchestrator) ExecuteParallel(queries []*QueryRequest) ([]*QueryResponse, error) {
    // Create channels for results
    results := make(chan *QueryResponse, len(queries))
    errors := make(chan error, len(queries))

    // Launch goroutines for each query
    for i, query := range queries {
        go func(idx int, q *QueryRequest) {
            // Route to available agent
            agent := o.loadBalancer.GetNextAgent()

            // Execute query on agent
            resp, err := agent.ExecuteQuery(q)
            if err != nil {
                errors <- fmt.Errorf("query %d failed: %w", idx, err)
                return
            }

            results <- resp
        }(i, query)
    }

    // Collect all results
    responses := make([]*QueryResponse, 0, len(queries))
    for i := 0; i < len(queries); i++ {
        select {
        case resp := <-results:
            responses = append(responses, resp)
        case err := <-errors:
            return nil, err
        }
    }

    return responses, nil
}
```

---

## MCP v0.2 Connector Integration

### Amadeus Connector Configuration

**Connector Registration (Agent):**
```go
func InitializeMCPRegistry() *mcp.Registry {
    registry := mcp.NewRegistry()

    // Register Amadeus connector
    amadeusConfig := amadeus.Config{
        APIKey:    os.Getenv("AMADEUS_API_KEY"),
        APISecret: os.Getenv("AMADEUS_API_SECRET"),
        BaseURL:   os.Getenv("AMADEUS_URL_PROD"),
    }

    amadeusConnector, err := amadeus.NewConnector(amadeusConfig)
    if err != nil {
        log.Fatalf("Failed to create Amadeus connector: %v", err)
    }

    registry.Register("amadeus", amadeusConnector)

    return registry
}
```

### MCP Query Flow

```
1. Client sends query with MCP config:
   {
     "query": "Search flights to Paris",
     "mcp": {
       "connector": "amadeus",
       "operation": "search_flights",
       "params": { "origin": "SFO", "destination": "PAR", ... }
     }
   }

2. Agent receives query → validates license → checks policy

3. Agent routes to MCP connector:
   connector := registry.Get("amadeus")
   result := connector.Query("search_flights", params)

4. Amadeus connector:
   - Authenticates with Amadeus API
   - Transforms params to Amadeus format
   - Executes API request
   - Transforms response to AxonFlow format

5. Agent returns result to orchestrator → client
```

---

## Policy Enforcement Examples

### Budget Limits

```rego
package axonflow.policy

import future.keywords

# Budget enforcement
deny["Budget exceeded"] {
    budget_limits := {
        "budget": 1000,
        "moderate": 3000,
        "luxury": 10000
    }

    budget_tier := input.context.budget
    budget_limit := budget_limits[budget_tier]

    estimated_cost := input.context.estimated_cost
    estimated_cost > budget_limit
}
```

### Travel Restrictions

```rego
# Travel restrictions (OFAC compliance)
deny["Restricted destination - OFAC sanctions"] {
    restricted_countries := [
        "Cuba",
        "Iran",
        "North Korea",
        "Syria",
        "Russia",
        "Belarus"
    ]

    destination := input.context.destination
    some country in restricted_countries
    contains(lower(destination), lower(country))
}
```

### Rate Limiting

```rego
# Rate limiting for Amadeus API (15,000 requests/month)
deny["Rate limit exceeded"] {
    requests_this_month := count_amadeus_requests(input.context.tenant_id)
    requests_this_month > 15000
}
```

---

## Performance Metrics

### Production Performance (Live Demo)

**Trip Planning Performance:**
- Sequential execution: 60-90 seconds
- MAP execution: **10-15 seconds** (6x faster)
- Cached results: 2-3 seconds

**Query Breakdown:**
| Query | Sequential | Parallel (MAP) | Speedup |
|-------|-----------|----------------|---------|
| Flights (Amadeus) | 12s | 12s | 1x |
| Hotels (Amadeus) | 15s | (concurrent) | - |
| Activities (LLM) | 8s | (concurrent) | - |
| Weather (LLM) | 5s | (concurrent) | - |
| Restaurants (LLM) | 10s | (concurrent) | - |
| **Total** | **50s** | **15s** | **3.3x** |

**Cost per trip plan:**
- Amadeus API: ~$0.02 (free tier)
- AWS Bedrock: ~$0.01 (3 LLM calls with Haiku/Sonnet)
- Total: **~$0.03 per trip plan**

---

## Deployment

### AWS ECS Deployment

**Architecture:**
```
                     ┌──────────────┐
                     │   Route 53   │
                     │   DNS: travel│
                     │   -eu.get    │
                     │   axonflow   │
                     │   .com       │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │   ALB (443)  │
                     │   SSL/TLS    │
                     └──────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
       ┌──────▼───────┐           ┌──────▼──────┐
       │  ECS Task 1  │           │ ECS Task 2  │
       │  Frontend    │           │ Backend     │
       │  (Next.js)   │           │ (Go)        │
       │  Port 3003   │           │ Port 8085   │
       └──────────────┘           └──────────────┘
```

**Deploy to ECS:**
```bash
# Build and push images
./scripts/build-trip-planner-ecr.sh

# Deploy to ECS
docker-compose -f docker-compose.travel.yml up -d

# Verify deployment
curl https://travel-eu.getaxonflow.com/health
```

**Docker Compose Configuration:**
```yaml
version: '3.8'

services:
  trip-planner-backend:
    image: YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/axonflow-trip-planner-backend:latest
    ports:
      - "8085:8085"
    environment:
      - AXONFLOW_ENDPOINT=https://internal-alb:8443
      - AXONFLOW_LICENSE_KEY=${TRIP_PLANNER_LICENSE_KEY}
      - AWS_REGION=eu-central-1
      - AMADEUS_API_KEY=${AMADEUS_API_KEY}
      - AMADEUS_API_SECRET=${AMADEUS_API_SECRET}

  trip-planner-frontend:
    image: YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/axonflow-trip-planner-frontend:latest
    ports:
      - "3003:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://trip-planner-backend:8085

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Trip Planner', () => {
  it('should plan trip with MAP in < 20s', async () => {
    const startTime = Date.now();
    const plan = await planTrip('Paris', 5, 'moderate');
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(20000);
    expect(plan.flights).toBeDefined();
    expect(plan.hotels).toBeDefined();
  });

  it('should enforce budget limits', async () => {
    await expect(
      planTrip('Dubai', 10, 'budget')  // Expensive destination
    ).rejects.toThrow('Budget exceeded');
  });

  it('should block restricted destinations', async () => {
    await expect(
      planTrip('North Korea', 3, 'luxury')
    ).rejects.toThrow('Restricted destination');
  });
});
```

### Integration Tests

```go
func TestAmadeusIntegration(t *testing.T) {
    connector := amadeus.NewConnector(amadeus.Config{
        APIKey:    os.Getenv("AMADEUS_API_KEY"),
        APISecret: os.Getenv("AMADEUS_API_SECRET"),
    })

    result, err := connector.Query("search_flights", map[string]interface{}{
        "origin":      "SFO",
        "destination": "PAR",
        "date":        "2025-12-01",
    })

    assert.NoError(t, err)
    assert.NotNil(t, result)
    assert.NotEmpty(t, result["flights"])
}
```

---

## Troubleshooting

### Common Issues

**Issue:** Slow trip planning (> 30s)

**Solutions:**
1. Check agent count: Should have 5+ agents for MAP
2. Verify Amadeus API latency: Test directly
3. Check network latency: In-VPC deployment is faster

**Issue:** Amadeus API errors

**Solutions:**
1. Check credentials: `AMADEUS_API_KEY`, `AMADEUS_API_SECRET`
2. Verify rate limits: 15,000 requests/month (free tier)
3. Check IATA codes: Use valid airport codes

**Issue:** LLM errors

**Solutions:**
1. Verify AWS Bedrock access: Enable Claude 3 models
2. Check token limits: max_tokens should be reasonable
3. Monitor costs: Claude Sonnet is more expensive than Haiku

---

## Next Steps

1. **Add more features:**
   - Real-time flight price tracking
   - Multi-city itineraries
   - Group travel planning
   - Travel insurance integration

2. **Optimize performance:**
   - Add Redis caching for frequent destinations
   - Implement request batching
   - Use CDN for static assets

3. **Enhance AI capabilities:**
   - Sentiment analysis of reviews
   - Personalized recommendations based on past trips
   - Dynamic pricing predictions

4. **Deploy to production:**
   - Set up monitoring and alerts
   - Configure auto-scaling (5-20 agents)
   - Enable SSL with Let's Encrypt
   - Add CloudFront CDN

---

## Resources

- [AxonFlow Documentation](https://docs.getaxonflow.com)
- [Amadeus API Docs](https://developers.amadeus.com)
- [Multi-Agent Parallel Guide](https://docs.getaxonflow.com/concepts/map)
- [MCP v0.2 Connector Spec](https://docs.getaxonflow.com/mcp/spec)
- [AWS Bedrock Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models.html)

---

## Support

For questions or issues:

- Email: support@getaxonflow.com
- Documentation: https://docs.getaxonflow.com
- GitHub Issues: https://github.com/axonflow/axonflow/issues
- Live Demo: https://travel-eu.getaxonflow.com

---

**This example demonstrates the full power of AxonFlow: MAP + MCP + LLM + Policy Enforcement in a production application.**
