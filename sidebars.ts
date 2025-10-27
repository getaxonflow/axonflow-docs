import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/infrastructure',
        'architecture/well-architected-review',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      collapsed: false,
      items: [
        'deployment/cloudformation',
        'deployment/post-deployment',
        'deployment/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'MCP Connectors',
      collapsed: false,
      items: [
        'mcp/overview',
      ],
    },
    {
      type: 'category',
      label: 'Policy-as-Code',
      collapsed: false,
      items: [
        'policies/syntax',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api/agent-endpoints',
      ],
    },
  ],
};

export default sidebars;
