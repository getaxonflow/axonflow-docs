# Protected Documentation Portal - Comprehensive Plan
## app.getaxonflow.com/docs

**Created:** November 12, 2025
**Owner:** Product & Engineering Team
**Status:** Planning → Implementation

---

## Executive Summary

Build a protected documentation portal at `app.getaxonflow.com/docs` that provides full implementation examples (healthcare, ecommerce) exclusively to AWS Marketplace customers. Access controlled via license key validation.

**Goals:**
1. ✅ Protect competitive advantage (implementation details behind paywall)
2. ✅ Increase AWS Marketplace conversions (clear value for paid users)
3. ✅ Reduce support burden (customers get complete guides)
4. ✅ Build customer community (forum, video tutorials)

**Success Metrics:**
- License key validation: <100ms
- Portal uptime: 99.9%
- Customer satisfaction: >90% find docs helpful
- AWS Marketplace conversion increase: >15%

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    app.getaxonflow.com                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │  Public Page │         │  Login Page  │                      │
│  │  (Landing)   │────────▶│  (License    │                      │
│  │              │         │   Validation)│                      │
│  └──────────────┘         └──────┬───────┘                     │
│                                   │                              │
│                                   ▼                              │
│                          ┌────────────────┐                     │
│                          │ Auth Middleware│                     │
│                          │ (Validate Key) │                     │
│                          └────────┬───────┘                     │
│                                   │                              │
│              ┌────────────────────┼────────────────────┐        │
│              ▼                    ▼                    ▼         │
│     ┌────────────────┐   ┌──────────────┐   ┌──────────────┐  │
│     │  /docs/        │   │  /community  │   │  /videos     │   │
│     │  Protected     │   │  Forum       │   │  Tutorials   │   │
│     │  Examples      │   │  (Customers) │   │  (Customers) │   │
│     └────────────────┘   └──────────────┘   └──────────────┘  │
│              │                    │                    │         │
│              ▼                    ▼                    ▼         │
│     ┌────────────────────────────────────────────────────────┐ │
│     │           Customer Portal Backend API                  │ │
│     │  - License validation                                  │ │
│     │  - Usage tracking                                      │ │
│     │  - Analytics                                           │ │
│     └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  AxonFlow Platform DB    │
                    │  (PostgreSQL)            │
                    │  - License keys          │
                    │  - Organizations         │
                    │  - Usage analytics       │
                    └──────────────────────────┘
```

---

## System Components

### 1. Frontend (app.getaxonflow.com/docs)

**Technology:** Next.js 14 + TypeScript + Tailwind CSS

**Pages:**
- `/` - Landing page (teaser, value prop, "Sign in with License Key")
- `/login` - License key validation
- `/docs` - Protected documentation (healthcare, ecommerce full implementations)
- `/docs/healthcare` - Healthcare full implementation
- `/docs/ecommerce` - Ecommerce full implementation
- `/docs/advanced-policies` - Advanced policy templates
- `/docs/production-guides` - Production optimization guides
- `/community` - Customer forum (future)
- `/videos` - Video tutorials (future)

**Key Features:**
- Server-side rendering (SSR) for SEO
- License key validation middleware
- Session management (JWT tokens)
- Mobile-responsive design
- Dark mode support
- Search functionality (Algolia DocSearch)
- Copy-to-clipboard for code examples
- Live code playground (CodeSandbox integration)

### 2. Authentication System

**Method:** License Key Validation

**Flow:**
```
1. User enters license key on /login page
2. Frontend sends key to backend API: POST /api/auth/validate
3. Backend validates key against database:
   - Check if key exists
   - Check if key is active (not expired/revoked)
   - Check organization permissions
   - Log access attempt
4. Backend returns JWT token (1 hour expiry)
5. Frontend stores JWT in httpOnly cookie
6. Middleware validates JWT on protected routes
7. Auto-refresh token when user is active
```

**Security:**
- Rate limiting: 5 attempts per 15 minutes per IP
- License key format: `AXON-{TIER}-{ORG_ID}-{DATE}-{SIGNATURE}`
- Example: `AXON-PROF-healthcorp-20251112-a8f3e7c2b1d4`
- JWT secret: Stored in AWS Secrets Manager
- HTTPS only (TLS 1.3)
- CSRF protection
- XSS protection (Content Security Policy)

**Session Management:**
- JWT stored in httpOnly cookie (prevents XSS)
- 1 hour expiration
- Auto-refresh on activity
- Logout clears cookie and invalidates token

### 3. Backend API

**Technology:** Next.js API Routes or Express.js

**Endpoints:**

#### Authentication
```typescript
POST /api/auth/validate
Request:  { license_key: string }
Response: {
  success: boolean,
  token: string,
  organization: string,
  tier: 'Professional' | 'Enterprise',
  expires_at: timestamp
}

POST /api/auth/refresh
Request:  { token: string }
Response: { token: string, expires_at: timestamp }

POST /api/auth/logout
Request:  { token: string }
Response: { success: boolean }
```

#### Documentation Access
```typescript
GET /api/docs/:example
Headers: { Authorization: 'Bearer <jwt>' }
Response: {
  content: string,
  metadata: {
    last_updated: timestamp,
    version: string
  }
}

POST /api/docs/track-view
Request:  {
  organization_id: string,
  page: string,
  timestamp: timestamp
}
Response: { success: boolean }
```

#### Analytics
```typescript
GET /api/analytics/usage
Headers: { Authorization: 'Bearer <jwt>' }
Response: {
  docs_viewed: number,
  last_access: timestamp,
  popular_pages: string[]
}
```

### 4. Database Schema

**Table: `organizations`**
```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  org_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL, -- 'Professional' | 'Enterprise'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_org_id ON organizations(org_id);
```

**Table: `license_keys`**
```sql
CREATE TABLE license_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active' | 'expired' | 'revoked'
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_license_key ON license_keys(key);
CREATE INDEX idx_org_license ON license_keys(organization_id);
```

**Table: `docs_access_logs`**
```sql
CREATE TABLE docs_access_logs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  license_key_id INTEGER REFERENCES license_keys(id),
  page VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_org_access ON docs_access_logs(organization_id);
CREATE INDEX idx_page_access ON docs_access_logs(page);
CREATE INDEX idx_accessed_at ON docs_access_logs(accessed_at);
```

**Table: `sessions`**
```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  token VARCHAR(512) UNIQUE NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_session_token ON sessions(token);
CREATE INDEX idx_session_expires ON sessions(expires_at);
```

### 5. Content Storage

**Option A: File-based (Recommended for MVP)**
```
/docs-content/
  /protected/
    /healthcare-full.md
    /ecommerce-full.md
    /advanced-policies/
      /healthcare-rbac.md
      /ecommerce-pricing.md
    /production-guides/
      /deployment-optimization.md
      /monitoring-setup.md
```

**Option B: Database (Future Enhancement)**
- Store markdown content in PostgreSQL
- Enable versioning
- Support collaborative editing

**Content Delivery:**
- Serve markdown files via API
- Render on frontend using `react-markdown`
- Syntax highlighting with `prism-react-renderer`
- Code copy buttons
- Table of contents auto-generation

---

## Implementation Phases

### Phase 2.1: MVP (Week 1-2) - Core Portal

**Goal:** Basic protected docs portal with license key auth

**Tasks:**
1. ✅ Set up Next.js app at `/Users/saurabhjain/Development/axonflow/platform/customer-portal-docs`
2. ✅ Create landing page with "Sign In" CTA
3. ✅ Build login page with license key input
4. ✅ Implement backend API for license validation
5. ✅ Add database tables (organizations, license_keys, sessions)
6. ✅ Create protected `/docs` route with middleware
7. ✅ Display healthcare-full.md and ecommerce-full.md
8. ✅ Deploy to app.getaxonflow.com/docs (subdomain)

**Deliverables:**
- Working login flow
- Protected docs accessible only with valid license key
- Healthcare & ecommerce full implementations viewable

**Success Criteria:**
- License validation works (<100ms)
- Protected content requires authentication
- Session persists for 1 hour
- Mobile-responsive UI

### Phase 2.2: Enhanced UX (Week 3)

**Goal:** Professional documentation experience

**Tasks:**
1. ✅ Add search functionality (Algolia DocSearch)
2. ✅ Implement code copy-to-clipboard
3. ✅ Add dark mode toggle
4. ✅ Create table of contents sidebar
5. ✅ Add "Was this helpful?" feedback
6. ✅ Implement analytics tracking (page views)
7. ✅ Add CloudFormation download buttons
8. ✅ Create video tutorial embeds (YouTube/Vimeo)

**Deliverables:**
- Polished documentation UI
- Search works across all protected docs
- Analytics dashboard for tracking usage

**Success Criteria:**
- User can find content in <10 seconds
- 90%+ "Was this helpful?" positive ratings
- Zero 404 errors

### Phase 2.3: Advanced Features (Week 4+)

**Goal:** Community and collaboration

**Tasks:**
1. ✅ Build customer forum (/community)
2. ✅ Add video tutorial library (/videos)
3. ✅ Create live code playground (CodeSandbox integration)
4. ✅ Add "Request a Feature" form
5. ✅ Implement email notifications (new content)
6. ✅ Build admin dashboard (track usage, manage keys)
7. ✅ Add SSO integration (Okta, Auth0) for Enterprise

**Deliverables:**
- Customer community platform
- Video tutorial library (10+ tutorials)
- Interactive code playground
- Admin analytics dashboard

**Success Criteria:**
- 50+ forum posts in first month
- 100+ video views in first month
- 10+ feature requests submitted

---

## Deployment Architecture

### Infrastructure (AWS)

```
┌─────────────────────────────────────────────────────────┐
│                     Route 53                            │
│           app.getaxonflow.com/docs                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              CloudFront CDN                             │
│  - SSL/TLS termination (ACM certificate)                │
│  - DDoS protection (AWS Shield)                         │
│  - Cache static assets (JS, CSS, images)                │
│  - Cache docs content (5 min TTL)                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│          Application Load Balancer (ALB)                │
│  - HTTPS only (redirect HTTP → HTTPS)                   │
│  - Health checks (/health)                              │
│  - Target group: ECS tasks                              │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  ECS Task 1  │    │  ECS Task 2  │
│  Next.js App │    │  Next.js App │
│  (Fargate)   │    │  (Fargate)   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
        ┌────────────────┐
        │  RDS PostgreSQL│
        │  (Multi-AZ)    │
        │  - Organizations│
        │  - License Keys │
        │  - Access Logs  │
        └────────────────┘
```

**Resources:**
- **Compute:** ECS Fargate (2 tasks, 0.5 vCPU, 1GB RAM each)
- **Database:** RDS PostgreSQL (db.t3.micro, Multi-AZ)
- **Storage:** S3 for static assets + CloudFront
- **DNS:** Route 53 hosted zone
- **SSL:** ACM certificate for app.getaxonflow.com
- **Monitoring:** CloudWatch Logs + Metrics

**Scaling:**
- Auto-scaling: 2-10 ECS tasks based on CPU/Memory
- Database: Scale up to db.t3.medium if needed
- CloudFront handles traffic spikes (no additional config)

**Cost Estimate (Monthly):**
- ECS Fargate (2 tasks): ~$30
- RDS PostgreSQL (db.t3.micro): ~$25
- ALB: ~$20
- CloudFront: ~$10 (low traffic)
- Route 53: ~$1
- **Total: ~$86/month** (for MVP, scales with usage)

---

## Security Considerations

### Authentication & Authorization

1. **License Key Security:**
   - Keys stored hashed in database (bcrypt)
   - Keys transmitted over HTTPS only
   - Rate limiting on validation endpoint
   - Failed attempt logging

2. **Session Security:**
   - JWT tokens with short expiration (1 hour)
   - httpOnly cookies (prevent XSS)
   - Secure flag (HTTPS only)
   - SameSite=Strict (prevent CSRF)

3. **Access Control:**
   - Middleware validates JWT on every protected request
   - Organization-level permissions (Professional vs Enterprise)
   - IP allowlisting for Enterprise (optional)
   - Audit logging for all access

### Data Protection

1. **Encryption:**
   - TLS 1.3 for all traffic
   - Database encryption at rest (AWS RDS)
   - Secrets in AWS Secrets Manager (JWT secret, DB password)

2. **PII Handling:**
   - No PII collected (only org_id, not names/emails)
   - IP addresses anonymized after 90 days
   - GDPR-compliant (right to deletion)

3. **DDoS Protection:**
   - AWS Shield Standard (free)
   - CloudFront rate limiting
   - WAF rules for suspicious patterns

### Compliance

1. **HIPAA (if needed):**
   - Business Associate Agreement (BAA) with AWS
   - Encrypted storage and transmission
   - Audit logging enabled
   - Access controls enforced

2. **SOC 2 (future):**
   - Audit trail for all access
   - Encryption requirements met
   - Access control documentation

---

## Analytics & Monitoring

### Metrics to Track

**Usage Metrics:**
- Daily active users (DAU)
- Weekly active users (WAU)
- Most viewed pages
- Average session duration
- Search queries (what users look for)

**Business Metrics:**
- License keys generated
- License keys validated (active usage)
- Conversion from teaser → paid (via UTM tracking)
- Customer satisfaction (feedback ratings)

**Technical Metrics:**
- API response time (P50, P95, P99)
- Error rate (4xx, 5xx)
- Uptime (target: 99.9%)
- Database query performance

### Monitoring Setup

**CloudWatch Dashboards:**
1. **Application Health:**
   - ECS task health
   - CPU/Memory utilization
   - API response times
   - Error rates

2. **User Activity:**
   - License validations per hour
   - Page views per day
   - Search queries per day
   - Active sessions

**Alerts:**
- High error rate (>1% 5xx errors) → PagerDuty
- Slow response time (P95 >500ms) → Email
- Database connection errors → Slack
- License validation failures (>10/min) → Email

**Tools:**
- CloudWatch Logs + Metrics
- CloudWatch Alarms → SNS → PagerDuty/Slack/Email
- X-Ray for distributed tracing (optional)
- Third-party: Datadog or New Relic (future)

---

## Content Strategy

### Protected Documentation Library

**Tier 1: Professional ($15K/month)**
- Healthcare full implementation
- Ecommerce full implementation
- 10+ advanced policy templates
- Basic deployment guides
- Email support access

**Tier 2: Enterprise ($50K/month)**
- All Professional content
- 30+ advanced policy templates
- Production optimization playbooks
- Custom integration guides
- Video tutorials (20+ hours)
- Live code playgrounds
- Forum access
- Dedicated Slack channel

### Content Roadmap

**Month 1-2 (Launch):**
- ✅ Healthcare full implementation
- ✅ Ecommerce full implementation
- ✅ 5 advanced policy templates
- ✅ Basic deployment guide

**Month 3-4:**
- ✅ Trip planner advanced patterns
- ✅ 10 more policy templates (fintech, logistics, etc.)
- ✅ Performance optimization guide
- ✅ 5 video tutorials (getting started, deployment, policies)

**Month 5-6:**
- ✅ Fintech example (fraud detection)
- ✅ Logistics example (route optimization)
- ✅ Manufacturing example (predictive maintenance)
- ✅ 10 more video tutorials
- ✅ Customer success stories (case studies)

**Month 7+:**
- ✅ Live code playground
- ✅ Interactive tutorials
- ✅ Community forum launch
- ✅ Monthly webinars

---

## Migration Plan

### Moving Content from axonflow-docs

**Step 1: Copy Protected Content**
```bash
# Copy full implementations
cp docs/examples-protected/healthcare-full.md \
   platform/customer-portal-docs/content/protected/healthcare.md

cp docs/examples-protected/ecommerce-full.md \
   platform/customer-portal-docs/content/protected/ecommerce.md
```

**Step 2: Update Links**
- Change all internal links to point to app.getaxonflow.com/docs
- Update CTAs on public teasers to link to protected portal

**Step 3: Add New Content**
- Create advanced policy templates
- Write production optimization guides
- Record video tutorials

**Step 4: Test Access Control**
- Verify license key validation works
- Test expired/revoked keys are blocked
- Verify session management works

**Step 5: Deploy**
- Deploy to staging environment
- QA testing (security, functionality, performance)
- Deploy to production
- Update DNS (app.getaxonflow.com/docs)

---

## Success Criteria

### Launch Criteria (MVP)

- ✅ License key validation works (<100ms P95)
- ✅ Protected docs accessible only with valid key
- ✅ Healthcare & ecommerce full implementations viewable
- ✅ Mobile-responsive UI
- ✅ HTTPS enabled (TLS 1.3)
- ✅ Session management works (1 hour expiry)
- ✅ Uptime: 99%+ in first week

### 30-Day Success Metrics

- 50+ license keys validated (active usage)
- 500+ page views
- 90%+ "Was this helpful?" positive ratings
- <1% error rate
- <200ms P95 API response time
- Zero security incidents

### 90-Day Success Metrics

- 150+ active organizations
- 5,000+ page views
- 15%+ increase in AWS Marketplace conversions (attributed)
- 95%+ customer satisfaction
- 10+ forum posts (if launched)
- 100+ video views (if launched)

---

## Next Steps

1. **[IMMEDIATE]** Get approval on this plan
2. **[Week 1]** Set up Next.js app structure
3. **[Week 1]** Implement authentication backend
4. **[Week 1-2]** Build frontend (login, protected docs)
5. **[Week 2]** Deploy to staging
6. **[Week 2]** QA testing
7. **[Week 2]** Deploy to production
8. **[Week 3+]** Phase 2.2 enhancements

---

## Questions to Resolve

1. **Domain:** Confirm `app.getaxonflow.com/docs` or use `docs.getaxonflow.com/protected`?
2. **License Keys:** Generate automatically on AWS Marketplace subscription or manually?
3. **Tiers:** Should Basic tier ($5K/month) also get access or only Professional+?
4. **Analytics:** Which tool? (CloudWatch, Datadog, Mixpanel, PostHog?)
5. **Community:** Discourse forum or custom-built?
6. **Videos:** Host on YouTube (public) or Vimeo (private)?

---

**Owner:** Saurabh Jain
**Status:** Awaiting Approval
**Est. Timeline:** 2-4 weeks to MVP
**Est. Cost:** ~$86/month infrastructure + dev time
