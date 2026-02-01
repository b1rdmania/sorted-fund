import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Sorted.fund',
  description: 'Gasless transactions for Web3 games',
  base: '/docs/',
  outDir: '../frontend/dashboard-v2/docs',

  head: [
    ['link', { rel: 'icon', href: '/favicon.png' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap', rel: 'stylesheet' }],
  ],

  themeConfig: {
    logo: '/sorted-mark.svg',
    siteTitle: 'Sorted',

    nav: [
      { text: 'Docs', link: '/introduction' },
      { text: 'API', link: '/api-reference' },
      { text: 'Live Demo', link: 'https://sorted.fund/demo.html' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Quick Start', link: '/quick-start' },
          { text: 'How It Works', link: '/how-it-works' },
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'API Reference', link: '/api-reference' },
          { text: 'SDK Reference', link: '/sdk-reference' },
          { text: 'Contracts', link: '/contracts' },
        ]
      },
      {
        text: 'Resources',
        items: [
          { text: 'Examples', link: '/examples' },
          { text: 'FAQ', link: '/faq' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/b1rdmania/sorted-fund' }
    ],

    footer: {
      message: 'Built for games. Invisible to players.',
      copyright: 'Sorted.fund'
    },

    search: {
      provider: 'local'
    }
  }
})
