# AxonFlow Documentation

Official documentation site for AxonFlow - Enterprise AI Control Plane.

**Live Site:** https://docs.getaxonflow.com

## Overview

This repository contains the complete documentation for AxonFlow, built with [Docusaurus](https://docusaurus.io/).

AxonFlow provides:
- Sub-10ms policy enforcement
- Multi-agent orchestration (MAP)
- MCP v0.2 connector ecosystem
- In-VPC deployment via CloudFormation
- AWS Marketplace Container product

## Documentation Structure

- **Getting Started**: Quick start guide and AWS Marketplace deployment
- **Architecture**: System design, infrastructure, networking, security
- **Deployment**: CloudFormation, post-deployment configuration, troubleshooting
- **MCP Connectors**: Amadeus, Redis, PostgreSQL, HTTP REST, custom connectors
- **Policy-as-Code**: Syntax, examples, testing
- **API Reference**: Agent and Orchestrator endpoints
- **Monitoring**: CloudWatch, Grafana, performance tuning
- **Security**: Architecture, compliance, best practices

## Local Development

### Prerequisites

- Node.js 18.x or higher
- npm 10.x or higher

### Installation

```bash
# Clone repository
git clone https://github.com/AxonFlowInc/axonflow-docs.git
cd axonflow-docs

# Install dependencies
npm install
```

### Development Server

```bash
npm start
```

Opens browser at http://localhost:3000 with live reload.

### Build

```bash
npm run build
```

Generates static content in `build/` directory.

### Serve Production Build

```bash
npm run serve
```

Serves production build locally at http://localhost:3000.

## Deployment

Documentation is automatically deployed to CloudFlare Pages on every push to `main`.

**Deployment Details:**
- Platform: CloudFlare Pages
- Build Command: `npm run build`
- Output Directory: `build`
- Auto-deploy: Enabled on `main` branch

See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

### Adding New Documentation

1. Create markdown file in appropriate `docs/` subdirectory
2. Add to `sidebars.ts` configuration
3. Test locally: `npm start`
4. Build to verify: `npm run build`
5. Commit and push

### Updating Existing Docs

1. Edit markdown file
2. Test changes locally
3. Commit with descriptive message
4. Push to trigger automatic deployment

### Guidelines

- Use clear, concise language
- Include code examples where appropriate
- Add links to related documentation
- Test all code examples before committing
- Maintain consistent formatting

## Project Structure

```
axonflow-docs/
├── docs/                   # Documentation markdown files
│   ├── getting-started.md
│   ├── architecture/       # Architecture docs
│   ├── deployment/         # Deployment guides
│   ├── api/               # API reference
│   ├── mcp/               # MCP connector docs
│   ├── policies/          # Policy-as-code docs
│   ├── monitoring/        # Monitoring guides
│   └── security/          # Security documentation
├── src/                   # React components
│   └── pages/            # Custom pages
├── static/               # Static assets
│   └── img/             # Images and logos
├── docusaurus.config.ts  # Docusaurus configuration
├── sidebars.ts           # Sidebar configuration
└── package.json          # Dependencies
```

## Documentation Pages

### Current Pages (11)

1. Getting Started
2. Architecture Overview
3. Architecture Infrastructure
4. Deployment CloudFormation
5. Deployment Post-Deployment
6. Deployment Troubleshooting
7. MCP Connectors Overview
8. Policy-as-Code Syntax
9. API Agent Endpoints
10. Homepage
11. Features Page

### Planned Pages

- Architecture Networking
- Architecture Security
- MCP Individual Connectors (Amadeus, Redis, PostgreSQL, HTTP REST)
- Policy Examples
- Policy Testing
- API Orchestrator Endpoints
- Monitoring CloudWatch
- Monitoring Performance Tuning
- Security Architecture
- Security Compliance

## Build Status

Build succeeds with warnings about broken links to planned pages (expected).

**Build Command:** `npm run build`
**Status:** SUCCESS
**Build Time:** ~10 seconds
**Output:** `build/` directory

## Support

- **Documentation Issues**: Open GitHub issue
- **AxonFlow Support**: support@getaxonflow.com
- **Website**: https://getaxonflow.com

## License

Copyright 2025 AxonFlow Inc. All rights reserved.

## Links

- **Production Site**: https://docs.getaxonflow.com
- **Main Website**: https://getaxonflow.com
- **AWS Marketplace**: https://aws.amazon.com/marketplace/seller-profile?id=seller-o2ymsaotlum32
- **Demo Portal**: https://customer.getaxonflow.com

---

Built with [Docusaurus](https://docusaurus.io/) | Deployed on [CloudFlare Pages](https://pages.cloudflare.com/)
