import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '2026前端八股文学习文档',
  description: '前端面试八股文完整版',
  base: '/qianduanmianshimd/',
  ignoreDeadLinks: true,
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => ['img', 'script', 'style', 'template', 'details', 'summary'].includes(tag)
      }
    }
  },
  markdown: {
    lineNumbers: false
  },
  build: {
    chunkSizeWarningLimit: 2000
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],
    outline: {
      level: [2, 3]
    },
    sidebar: [
      {
        text: '目录',
        items: [
          { text: '第1章 HTML5与Web标准核心', link: '/chapters/第1章 HTML5与Web标准核心' },
          { text: '第2章 CSS核心原理与布局系统', link: '/chapters/第2章 CSS核心原理与布局系统' },
          { text: '第3章 JavaScript语言核心深度解析', link: '/chapters/第3章 JavaScript语言核心深度解析' },
          { text: '第4章 浏览器原理与网络协议', link: '/chapters/第4章 浏览器原理与网络协议' },
          { text: '第5章 TypeScript类型系统精要（类型篇）', link: '/chapters/第5章 TypeScript类型系统精要（类型篇）' },
          { text: '第6章 React技术栈深度原理（框架篇-React）', link: '/chapters/第6章 React技术栈深度原理（框架篇-React）' },
          { text: '第7章 Vue技术栈深度原理（框架篇-Vue）', link: '/chapters/第7章 Vue技术栈深度原理（框架篇-Vue）' },
          { text: '第8章 前端工程化与构建工具（工程篇）', link: '/chapters/第8章 前端工程化与构建工具（工程篇）' },
          { text: '第9章 性能优化与安全（优化篇）', link: '/chapters/第9章 性能优化与安全（优化篇）' },
          { text: '第10章 高频手写代码实现（手写篇）', link: '/chapters/第10章 高频手写代码实现（手写篇）' },
          { text: '第11章 数据结构与算法（算法篇）', link: '/chapters/第11章 数据结构与算法（算法篇）' },
          { text: '第12章 2026 面试题（面试篇）', link: '/chapters/第12章 2026 面试题（面试篇）' }
        ]
      }
    ]
  }
})
