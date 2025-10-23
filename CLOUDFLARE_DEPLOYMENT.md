# CloudFlare Pages Deployment Instructions

This guide walks you through deploying the AxonFlow documentation site to CloudFlare Pages.

## Prerequisites

- CloudFlare account (Pro or higher recommended)
- GitHub account
- Git repository for axonflow-docs

## Step 1: Push to GitHub

First, push the docs repository to GitHub:

```bash
cd /Users/saurabhjain/Development/axonflow-docs

# Initialize git (if not already done)
git init

# Create .gitignore
cat > .gitignore <<EOF
node_modules
.docusaurus
build
.DS_Store
.env
.env.local
EOF

# Add and commit all files
git add .
git commit -m "Initial commit: AxonFlow documentation site

- Complete Docusaurus setup with AxonFlow branding
- 10+ documentation pages covering all major topics
- Getting Started, Architecture, Deployment guides
- MCP Connectors, Policy-as-Code, API Reference
- Troubleshooting and monitoring guides
- Production-ready build configuration"

# Create GitHub repository (via GitHub CLI or web interface)
gh repo create AxonFlowInc/axonflow-docs --public --source=. --remote=origin --push

# Or manually add remote and push
git remote add origin git@github.com:AxonFlowInc/axonflow-docs.git
git branch -M main
git push -u origin main
```

## Step 2: Connect to CloudFlare Pages

1. **Login to CloudFlare Dashboard**
   - Navigate to https://dash.cloudflare.com
   - Select your account

2. **Go to Pages**
   - Click "Pages" in the left sidebar
   - Click "Create a project"

3. **Connect to GitHub**
   - Click "Connect to Git"
   - Authorize CloudFlare to access your GitHub account
   - Select "AxonFlowInc/axonflow-docs" repository

## Step 3: Configure Build Settings

**Project Settings:**

| Setting | Value |
|---------|-------|
| Project name | axonflow-docs |
| Production branch | main |
| Framework preset | Docusaurus |
| Build command | `npm run build` |
| Build output directory | `build` |
| Root directory | `/` |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| NODE_VERSION | 18 |
| NPM_VERSION | 10 |

**Advanced Settings:**

- Node.js version: 18.x (or latest LTS)
- Build cache: Enabled
- Branch deployments: Enabled (optional)

## Step 4: Deploy

1. Click "Save and Deploy"
2. Wait for initial deployment (3-5 minutes)
3. CloudFlare will:
   - Clone the repository
   - Install dependencies (`npm install`)
   - Build the site (`npm run build`)
   - Deploy to CloudFlare's global CDN

## Step 5: Configure Custom Domain

1. **In CloudFlare Pages Project:**
   - Go to "Custom domains" tab
   - Click "Set up a custom domain"
   - Enter: `docs.getaxonflow.com`

2. **DNS Configuration:**
   - CloudFlare will automatically configure DNS if domain is on CloudFlare
   - If not, add CNAME record:
     ```
     CNAME docs.getaxonflow.com -> axonflow-docs.pages.dev
     ```

3. **SSL/TLS:**
   - SSL automatically provisioned by CloudFlare
   - Full (strict) encryption enabled by default

## Step 6: Verify Deployment

1. **Check Build Status:**
   - Go to "Deployments" tab
   - Verify status is "Success"

2. **Test Site:**
   ```bash
   # Test CloudFlare Pages URL
   curl -I https://axonflow-docs.pages.dev

   # Test custom domain (after DNS propagation)
   curl -I https://docs.getaxonflow.com
   ```

3. **Verify Pages:**
   - https://docs.getaxonflow.com (homepage)
   - https://docs.getaxonflow.com/docs/getting-started
   - https://docs.getaxonflow.com/docs/architecture/overview
   - https://docs.getaxonflow.com/docs/deployment/cloudformation

## Deployment Workflow

### Automatic Deployments

Every push to `main` branch triggers automatic deployment:

```bash
# Make changes
vim docs/getting-started.md

# Commit and push
git add .
git commit -m "Update getting started guide"
git push origin main

# CloudFlare automatically deploys (2-3 minutes)
```

### Preview Deployments

Pull requests automatically get preview URLs:

```bash
# Create feature branch
git checkout -b feature/new-page

# Make changes
vim docs/new-page.md

# Push and create PR
git push origin feature/new-page
gh pr create --title "Add new page"

# CloudFlare creates preview at:
# https://[commit-hash].axonflow-docs.pages.dev
```

## Rollback

To rollback to previous deployment:

1. Go to "Deployments" tab
2. Find previous successful deployment
3. Click "..." menu
4. Click "Rollback to this deployment"
5. Confirm rollback

Or via CLI:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# List deployments
wrangler pages deployment list --project-name axonflow-docs

# Rollback
wrangler pages deployment rollback --project-name axonflow-docs --deployment-id DEPLOYMENT_ID
```

## Performance Optimization

CloudFlare automatically optimizes:

- **Minification**: JavaScript, CSS, HTML
- **Compression**: Brotli and gzip
- **HTTP/3**: Enabled by default
- **Auto Minify**: JavaScript, CSS, HTML
- **Early Hints**: Enabled

**Additional Optimizations:**

1. **Enable Argo Smart Routing** (recommended):
   - Go to Traffic > Argo
   - Enable Argo Smart Routing
   - Reduces latency by ~30%

2. **Configure Cache Rules**:
   - Cache static assets longer
   - Purge cache on deployment

3. **Enable Zaraz** (analytics):
   - Go to Zaraz in dashboard
   - Add Google Analytics or other tools

## Monitoring

### Build Notifications

Set up notifications for build failures:

1. Go to "Settings" > "Notifications"
2. Add webhook URL (Slack, Discord, email)
3. Select events: "Build failure", "Build success"

### Analytics

View analytics in CloudFlare Dashboard:

- **Traffic**: Requests, bandwidth, cache hit ratio
- **Performance**: Page load times, Core Web Vitals
- **Geo**: Traffic by country
- **Threats**: Security threats blocked

### Custom Analytics

Add analytics to site:

```typescript
// docusaurus.config.ts
{
  plugins: [
    [
      '@docusaurus/plugin-google-analytics',
      {
        trackingID: 'G-XXXXXXXXXX',
        anonymizeIP: true,
      },
    ],
  ],
}
```

## Troubleshooting

### Build Fails

**Check build logs:**
1. Go to "Deployments" tab
2. Click on failed deployment
3. View "Build log"

**Common issues:**
- Node version mismatch: Set `NODE_VERSION=18` in environment variables
- Missing dependencies: Check `package.json`
- Build command error: Verify `npm run build` works locally

### Site Not Updating

**Solutions:**
1. Check deployment status (may take 2-3 minutes)
2. Purge CloudFlare cache:
   - Go to Caching > Configuration
   - Click "Purge Everything"
3. Check DNS propagation: https://whatsmydns.net

### Custom Domain Not Working

**Solutions:**
1. Verify DNS records:
   ```bash
   dig docs.getaxonflow.com
   ```
2. Check SSL certificate status (can take 5-10 minutes)
3. Ensure CNAME points to `axonflow-docs.pages.dev`

## Cost

**CloudFlare Pages Pricing:**

- **Free Tier**:
  - 500 builds/month
  - Unlimited requests
  - Unlimited bandwidth
  - 1 build at a time

- **Pro ($20/month)**:
  - 5,000 builds/month
  - 5 concurrent builds
  - Advanced features

**Recommendation:** Free tier is sufficient for documentation site.

## Security

CloudFlare Pages includes:

- **DDoS Protection**: Automatic mitigation
- **WAF (Web Application Firewall)**: Pro plan
- **SSL/TLS**: Automatic certificate provisioning
- **Access Control**: Restrict preview deployments

**Enable Access Control:**

1. Go to "Settings" > "Access control"
2. Configure authentication (GitHub, Google, email)
3. Restrict preview URLs to team members

## Maintenance

### Weekly

- Review deployment logs for errors
- Check analytics for traffic patterns
- Monitor build times (should be <3 minutes)

### Monthly

- Update dependencies: `npm update`
- Review and update documentation content
- Check for broken links: `npm run build` (checks links)

### Quarterly

- Review CloudFlare analytics
- Optimize images and assets
- Update Docusaurus version

## Support

**CloudFlare Support:**
- Documentation: https://developers.cloudflare.com/pages/
- Community: https://community.cloudflare.com/
- Status: https://www.cloudflarestatus.com/

**Docusaurus Support:**
- Documentation: https://docusaurus.io/
- Discord: https://discord.gg/docusaurus

## Next Steps

1. **Configure Analytics**: Add Google Analytics or Plausible
2. **Set Up Search**: Add Algolia DocSearch
3. **Enable Monitoring**: Set up uptime monitoring
4. **Create Redirects**: Configure URL redirects if needed
5. **Optimize Images**: Compress and optimize images
6. **Add Sitemap**: Docusaurus generates automatically

## Quick Reference

**CloudFlare Pages URL:** https://axonflow-docs.pages.dev
**Custom Domain:** https://docs.getaxonflow.com
**Repository:** https://github.com/AxonFlowInc/axonflow-docs
**Build Command:** `npm run build`
**Output Directory:** `build`
**Node Version:** 18.x

---

**Last Updated:** October 23, 2025
**Maintained by:** AxonFlow Engineering Team
