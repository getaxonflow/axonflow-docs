# Video Tutorial Script: AxonFlow 5-Minute Quickstart

**Duration:** 5 minutes
**Target Audience:** Developers new to AxonFlow
**Goal:** Get first AI agent query working in under 5 minutes
**Format:** Screen recording + voiceover

---

## Pre-Production Checklist

**Before Recording:**
- [ ] Clean terminal (no clutter)
- [ ] Font size 18pt+ (readable on mobile)
- [ ] Dark theme (easier on eyes)
- [ ] Prepare demo environment (AWS account ready, credentials ready)
- [ ] Test script run-through (ensure <5 min)
- [ ] Background music: Soft, non-distracting (optional)

**Required Tools:**
- AWS Account with Marketplace access
- Terminal with bash
- Code editor (VS Code recommended)
- Screen recording software (Loom, OBS, or QuickTime)

---

## Video Script

### SEGMENT 1: INTRO (0:00 - 0:30)

**[SCREEN: AxonFlow logo + title slide]**

**Voiceover:**
> "Hi! I'm going to show you how to deploy AxonFlow and send your first AI agent query in under 5 minutes. AxonFlow is the infrastructure layer for production AI—adding governance, compliance, and sub-10ms performance to your LLM applications. Let's get started."

**[TRANSITION: Fade to AWS Console]**

---

### SEGMENT 2: DEPLOY WITH CLOUDFORMATION (0:30 - 2:00)

**[SCREEN: AWS Marketplace - AxonFlow listing]**

**Voiceover:**
> "First, we'll deploy AxonFlow using our CloudFormation template. This sets up everything you need: ECS Fargate containers, PostgreSQL database, Application Load Balancer, and all the networking in about 15 minutes."

**[ACTION: Navigate to AWS Marketplace]**

**On-Screen Text:**
```
Step 1: AWS Marketplace → Search "AxonFlow"
```

**[SCREEN: Click "Continue to Subscribe"]**

**Voiceover:**
> "Click 'Continue to Subscribe', accept the terms, then launch the CloudFormation stack."

**[SCREEN: CloudFormation template parameters]**

**On-Screen Text:**
```
Step 2: Fill in parameters
VPC ID: vpc-xxxxx
Subnets: Select 2 private subnets
DBPassword: YourSecurePassword123!
```

**Voiceover:**
> "Fill in your VPC details and database password. We recommend using AWS Secrets Manager for production, but for this demo, we'll use a simple password."

**[ACTION: Scroll to bottom, click "Create Stack"]**

**Voiceover:**
> "Click 'Create Stack' and wait about 15 minutes. I'll fast-forward through the deployment."

**[TIME-LAPSE: CloudFormation stack creation progress]**

**On-Screen Text:**
```
⏱️ Stack deploying... (15 minutes)
✅ CREATE_COMPLETE
```

**Voiceover:**
> "Great! Our stack is deployed. Let's grab the API endpoint from the Outputs tab."

**[SCREEN: CloudFormation Outputs tab]**

**On-Screen Text:**
```
Step 3: Copy API Endpoint
AxonFlowAPIEndpoint: https://axonfl-AxonF-xxxx.eu-central-1.elb.amazonaws.com
```

---

### SEGMENT 3: GET LICENSE KEY (2:00 - 2:30)

**[SCREEN: AxonFlow Customer Portal login]**

**Voiceover:**
> "Next, we need a license key to authenticate our requests. Log into the AxonFlow customer portal with the credentials from your AWS Marketplace subscription confirmation email."

**On-Screen Text:**
```
Step 4: Get License Key
Portal: https://app.getaxonflow.com
Email: Your AWS email
Password: From subscription email
```

**[ACTION: Navigate to API Keys section]**

**Voiceover:**
> "Navigate to 'API Keys', click 'Generate New Key', and copy it. This is your authentication token."

**[SCREEN: Copy license key to clipboard]**

**On-Screen Text:**
```
✅ License Key: AXON-PLUS-acme-corp-20261111-a1b2c3d4
```

---

### SEGMENT 4: INSTALL SDK (2:30 - 3:00)

**[SCREEN: Terminal - new directory]**

**Voiceover:**
> "Now let's install the AxonFlow SDK. I'm using TypeScript, but we also have Go and Python SDKs."

**[TYPE IN TERMINAL]**
```bash
mkdir axonflow-quickstart && cd axonflow-quickstart
npm init -y
npm install @axonflow/sdk
```

**On-Screen Text:**
```
Step 5: Install SDK
Language: TypeScript (also: Go, Python)
Package: @axonflow/sdk
```

**Voiceover:**
> "The SDK handles all the communication with AxonFlow, including retries, error handling, and license key management."

---

### SEGMENT 5: FIRST QUERY (3:00 - 4:30)

**[SCREEN: Code editor - new file `app.ts`]**

**Voiceover:**
> "Let's write our first AI agent query. Create a file called `app.ts`."

**[TYPE CODE - Show typing animation or paste with highlighting]**

```typescript
import { AxonFlowClient } from '@axonflow/sdk';

const client = new AxonFlowClient({
  endpoint: 'https://axonfl-AxonF-xxxx.eu-central-1.elb.amazonaws.com',
  licenseKey: 'AXON-PLUS-acme-corp-20261111-a1b2c3d4'
});

async function main() {
  console.log('🚀 Sending query to AxonFlow...');

  const result = await client.query({
    query: 'What is the capital of France?',
    agent: 'general-knowledge'
  });

  console.log('✅ Response:', result.response);
  console.log('⏱️  Latency:', result.latency_ms, 'ms');
  console.log('💰 Tokens used:', result.tokens_used);
}

main();
```

**Voiceover:**
> "We import the SDK, create a client with our endpoint and license key, then send a simple query. Notice we specify the agent type—AxonFlow routes this to the appropriate LLM based on your configuration."

**On-Screen Text:**
```
Step 6: Write First Query
- Import SDK
- Configure endpoint + license key
- Send query with agent type
```

---

### SEGMENT 6: RUN & SEE RESULTS (4:30 - 4:50)

**[SCREEN: Terminal - run the code]**

**[TYPE IN TERMINAL]**
```bash
npx ts-node app.ts
```

**Voiceover:**
> "Now let's run it!"

**[SCREEN: Output appears]**

```
🚀 Sending query to AxonFlow...
✅ Response: The capital of France is Paris.
⏱️  Latency: 247 ms
💰 Tokens used: { input: 8, output: 7 }
```

**Voiceover:**
> "There we go! AxonFlow processed our query in 247 milliseconds and returned the correct answer. The response includes the answer, latency metrics, and token usage for cost tracking."

**On-Screen Text:**
```
✅ Success!
- Response: 247ms
- Governance: ✅ Applied
- Audit trail: ✅ Logged
```

---

### SEGMENT 7: WHAT JUST HAPPENED (4:50 - 5:30)

**[SCREEN: Architecture diagram animation]**

**Voiceover:**
> "So what just happened behind the scenes? Your query went through AxonFlow's governance layer, which checked your license, applied any policies like budget limits or content filtering, then routed it to the configured LLM—in this case, AWS Bedrock with Claude. The response came back through the same governance layer, creating an audit trail for compliance. All in under 250 milliseconds."

**[SCREEN: Diagram highlighting flow]**
```
Your App → AxonFlow Agent → Policy Check → LLM (Bedrock) → Response
           ↓
       Audit Log (compliance)
```

**On-Screen Text:**
```
Behind the Scenes:
1. License validation ✅
2. Policy enforcement ✅
3. LLM routing (Bedrock Claude) ✅
4. Audit logging ✅
5. Response in <250ms ✅
```

---

### SEGMENT 8: NEXT STEPS (5:30 - 6:00)

**[SCREEN: AxonFlow docs homepage]**

**Voiceover:**
> "You just deployed production AI infrastructure and sent your first query in under 5 minutes. Next steps: explore our documentation for advanced features like multi-agent workflows, custom policies, and LangChain integration. Thanks for watching!"

**On-Screen Text:**
```
🎉 Congratulations!

Next Steps:
📚 Docs: docs.getaxonflow.com
💬 Community: github.com/axonflow/discussions
📧 Support: support@getaxonflow.com

Try These Tutorials:
- Multi-Agent Workflows
- LangChain Integration
- Custom Policy Creation
- Healthcare HIPAA Example
```

**[SCREEN: AxonFlow logo + subscribe/like buttons]**

**Voiceover:**
> "If you found this helpful, please like and subscribe for more AxonFlow tutorials. See you next time!"

**[FADE OUT]**

---

## Post-Production Checklist

**Editing:**
- [ ] Add captions (accessibility + SEO)
- [ ] Add chapter markers (YouTube):
  - 0:00 - Introduction
  - 0:30 - Deploy with CloudFormation
  - 2:00 - Get License Key
  - 2:30 - Install SDK
  - 3:00 - Write First Query
  - 4:30 - Run & See Results
  - 4:50 - What Just Happened
  - 5:30 - Next Steps
- [ ] Add end screen (20 seconds) with links to:
  - Next tutorial (Agent Walkthrough)
  - Documentation
  - GitHub
- [ ] Export in multiple resolutions: 1080p, 720p, 480p

**Publishing:**
- [ ] YouTube title: "AxonFlow Quickstart: Deploy Production AI in 5 Minutes"
- [ ] Description:
```
Deploy AxonFlow and send your first AI agent query in under 5 minutes!

AxonFlow adds governance, compliance, and sub-10ms performance to your LLM applications. In this tutorial, you'll:

✅ Deploy AxonFlow with CloudFormation (15 min)
✅ Get your license key
✅ Install the SDK (TypeScript, Go, or Python)
✅ Send your first AI query
✅ Understand the governance layer

⏱️ Total time: 5 minutes

📚 Documentation: https://docs.getaxonflow.com
💬 Community: https://github.com/axonflow/discussions
📧 Support: support@getaxonflow.com

Chapters:
0:00 - Introduction
0:30 - Deploy with CloudFormation
2:00 - Get License Key
2:30 - Install SDK
3:00 - Write First Query
4:30 - Run & See Results
4:50 - What Just Happened
5:30 - Next Steps

#AxonFlow #AIInfrastructure #LLMOps #Governance #ProductionAI
```
- [ ] Tags: AxonFlow, AI Infrastructure, LLM, Governance, Compliance, AWS Bedrock, Claude, Production AI, Tutorial
- [ ] Thumbnail: Bold text "5-Minute Quickstart" + AxonFlow logo
- [ ] Playlist: AxonFlow Tutorials

**Promotion:**
- [ ] Share on Twitter/X
- [ ] Share on LinkedIn
- [ ] Share on Reddit (r/MachineLearning, r/AWS)
- [ ] Share in AxonFlow Slack community
- [ ] Add to documentation homepage

---

## Alternative Versions

### Version 2: No CloudFormation (docker-compose)

**For open-source users or local development:**

Replace SEGMENT 2 with:

**[SCREEN: Terminal - clone repository]**

**Voiceover:**
> "If you want to try AxonFlow locally without AWS, you can use our docker-compose setup."

**[TYPE IN TERMINAL]**
```bash
git clone https://github.com/axonflow/axonflow.git
cd axonflow
docker-compose up -d
```

**On-Screen Text:**
```
Local Development Option:
- Docker Compose (no AWS required)
- Great for PoCs and testing
- Upgrade to AWS Marketplace for production
```

Rest of video remains the same, using `http://localhost:8080` as endpoint.

---

### Version 3: Enterprise SSO (Advanced)

**For enterprise customers:**

Add SEGMENT after license key:

**[SCREEN: AxonFlow Admin Portal - SSO Configuration]**

**Voiceover:**
> "For enterprise deployments, you can configure SSO with Okta, Azure AD, or Auth0. This lets your team authenticate using your corporate credentials instead of managing individual license keys."

**On-Screen Text:**
```
Enterprise SSO:
- Okta ✅
- Azure AD ✅
- Auth0 ✅
- SAML 2.0 ✅
```

---

## Narration Tips

**Pacing:**
- Speak clearly and moderately (not too fast)
- Pause for 1-2 seconds after code appears on screen
- Emphasize key terms: "governance", "sub-10ms", "compliance"

**Tone:**
- Friendly but professional
- Excited but not overly enthusiastic
- Confident (you know what you're talking about)

**Energy:**
- Start strong (hook viewers in first 10 seconds)
- Maintain energy throughout
- Build excitement when showing results

**Common Mistakes to Avoid:**
- Don't say "um", "uh", "like"
- Don't apologize or hedge ("I think", "maybe")
- Don't rush through code explanations
- Don't assume knowledge (explain acronyms: "LLM means Large Language Model")

---

## Accessibility

**Captions:**
- Auto-generate captions via YouTube
- Manual review and fix errors
- Include technical terms correctly (AxonFlow, ECS Fargate, etc.)

**Audio Description (Optional):**
- For vision-impaired users
- Describe what's happening on screen
- Available as separate audio track

**Transcription:**
- Publish full transcript on documentation site
- Improves SEO
- Helps non-native English speakers

---

## Analytics & Iteration

**Track:**
- View count
- Watch time (aim for >80% completion)
- Drop-off points (where viewers leave)
- Engagement rate (likes, comments, shares)

**Iterate:**
- If drop-off at 2:00, shorten CloudFormation explanation
- If comments ask about X, create follow-up video
- A/B test thumbnails (test 2-3 versions)

**Success Metrics:**
- 1,000+ views in first month
- 5%+ conversion to documentation page
- 80%+ watch time completion
- 100+ likes

---

## Budget

**Production Costs:**
- Screen recording software: Free (QuickTime) or $15/mo (Loom)
- Video editing: Free (iMovie) or $21/mo (Adobe Premiere)
- Background music: Free (YouTube Audio Library)
- Thumbnail design: Free (Canva) or $13/mo (Canva Pro)

**Time Investment:**
- Script writing: 2 hours
- Recording: 1 hour (multiple takes)
- Editing: 3 hours
- Publishing/promotion: 1 hour
- **Total: 7 hours**

**ROI:**
- 1,000 views = ~50 new trial signups (5% conversion)
- 50 trials = ~5 paid customers (10% conversion)
- 5 customers × $5,000/year = $25,000 ARR
- **ROI: 3,571:1** (assuming $7/hour editing cost)

---

## Related Videos (Series)

**AxonFlow Tutorials Playlist:**
1. ✅ **5-Minute Quickstart** (this video)
2. **Agent Walkthrough: Healthcare Use Case** (15 min)
3. **LangChain Integration Deep Dive** (20 min)
4. **Custom Policy Creation** (10 min)
5. **Multi-Agent Workflows** (25 min)
6. **Production Deployment Best Practices** (30 min)

---

**Last Updated:** November 11, 2025
**Script Version:** 1.0
**Reviewer:** Engineering + Marketing Teams
