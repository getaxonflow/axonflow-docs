import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'AxonFlow Documentation',
  tagline: 'Enterprise AI Control Plane - Sub-10ms Governance & Multi-Agent Orchestration',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.getaxonflow.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'AxonFlowInc', // Usually your GitHub org/user name.
  projectName: 'axonflow-docs', // Usually your repo name.

  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'AxonFlow',
      logo: {
        alt: 'AxonFlow Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://getaxonflow.com',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://customer.getaxonflow.com',
          label: 'Demo',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture/overview',
            },
            {
              label: 'Deployment',
              to: '/docs/deployment/cloudformation',
            },
          ],
        },
        {
          title: 'Product',
          items: [
            {
              label: 'AWS Marketplace',
              href: 'https://aws.amazon.com/marketplace/seller-profile?id=seller-o2ymsaotlum32',
            },
            {
              label: 'Pricing',
              href: 'https://getaxonflow.com/pricing',
            },
          ],
        },
        {
          title: 'Support',
          items: [
            {
              label: 'Email Support',
              href: 'mailto:support@getaxonflow.com',
            },
            {
              label: 'Main Website',
              href: 'https://getaxonflow.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AxonFlow Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'go', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
