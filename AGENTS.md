# ServerHi 项目上下文指南

## 项目概述

**ServerHi** 是面向运维人员的 Linux 和 DevOps 技术手册。该项目是一个基于 Astro 5.0 构建的静态网站，专注于提供 Docker 容器化、Linux 系统管理、服务器配置和安全加固方面的实践教程。

### 核心特性

- **技术手册界面** - 可按主题、任务和故障入口浏览，文章包含目录和代码操作
- **SEO 优化** - 内置站点地图、元标签和结构化数据
- **高性能** - 使用 Astro 的静态站点生成
- **深色/浅色模式** - 带持久化偏好的主题切换
- **响应式设计** - 移动端优先的方法
- **搜索功能** - 集成 Pagefind 实现快速搜索
- **分类系统** - 按 Docker、Linux、DevOps 等组织内容
- **难度分级** - 初级、中级、高级教程

### 技术栈

- **框架**: Astro 5.0
- **UI 库**: React 18
- **样式**: 自定义 CSS + CSS 变量
- **内容**: Markdown + Frontmatter
- **搜索**: Pagefind
- **部署**: Vercel / Netlify / Cloudflare Pages

---

## 构建和运行

### 依赖要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
npm install
```

### 开发

```bash
npm run dev
```
开发服务器运行在 `http://localhost:4321`

### 构建

```bash
npm run build
```

此命令执行以下操作：
1. 运行 `astro check` 进行类型检查
2. 执行 `astro build` 构建生产版本
3. 运行 `pagefind --site dist` 生成搜索索引

### 预览生产构建

```bash
npm run preview
```

### 其他可用命令

```bash
npm run start    # 等同于 npm run dev
npm run astro    # 直接运行 Astro CLI
```

---

## 项目结构

```
serverhi-site/
├── config/                      # 配置文件目录
│   ├── site.json                # 站点元数据
│   ├── theme.json               # 主题配置（颜色、字体、效果）
│   ├── categories.json          # 内容分类定义
│   └── integrations.json        # 第三方集成配置
├── src/
│   ├── components/              # 可复用组件
│   │   ├── ArticleCard.astro    # 文章卡片组件
│   │   ├── Footer.astro         # 页脚组件
│   │   ├── Header.astro         # 页头组件
│   │   ├── SEO.astro            # SEO 元标签组件
│   │   └── TableOfContents.astro # 文章目录
│   ├── layouts/                 # 页面布局
│   │   └── BaseLayout.astro     # 基础布局
│   ├── pages/                   # 路由页面
│   │   ├── index.astro          # 首页
│   │   ├── about.astro          # 关于页面
│   │   ├── contact.astro        # 联系页面
│   │   ├── search.astro         # 搜索页面
│   │   ├── posts/               # 文章相关页面
│   │   │   ├── index.astro      # 文章列表
│   │   │   └── [slug].astro     # 单篇文章
│   │   ├── category/[slug].astro # 分类页面
│   │   └── tag/[slug].astro      # 标签页面
│   ├── content/                 # Markdown 内容
│   │   ├── config.ts            # 内容集合配置
│   │   └── posts/               # 教程文章
│   │       └── [post-slug]/     # 每篇文章一个文件夹
│   │           ├── index.md     # 文章内容
│   │           ├── cover.jpg    # 封面图片
│   │           └── cover.svg    # SVG 格式封面
│   ├── lib/                     # 工具函数
│   │   ├── config.ts            # 配置加载
│   │   ├── posts.ts             # 文章处理
│   │   └── utils.ts             # 通用工具
│   └── styles/                  # CSS 样式
│       ├── base.css             # 基础样式
│       ├── global.css           # 全局样式
│       ├── theme.css            # 主题样式
│       └── article.css          # 正文和代码排版
├── public/                      # 静态资源
│   ├── favicon.svg              # 网站图标
│   ├── robots.txt               # 爬虫规则
│   └── images/                  # 图片资源
└── docs/                        # 项目文档
```

---

## 开发规范

### 内容创建

#### 创建新教程

1. 在 `src/content/posts/` 中创建新文件夹：
```bash
mkdir src/content/posts/my-tutorial
```

2. 添加 `index.md` 和封面图片：
```bash
touch src/content/posts/my-tutorial/index.md
# 添加 cover.jpg 或 cover.svg
```

3. 使用 Frontmatter 编写教程：
```markdown
---
title: "教程标题"
description: "SEO 描述"
pubDate: 2026-02-07
coverImage: "./cover.jpg"
coverImageAlt: "封面图片描述"
category: "docker"
tags: ["Docker", "教程"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "beginner"
estimatedTime: "15 分钟"
prerequisites:
  - "前置条件1"
  - "前置条件2"
osCompatibility: ["Ubuntu 22.04", "Debian 11"]
---

## 内容在这里
```

#### 可用分类

必须在以下分类中选择：
- `docker` - Docker 和容器
- `linux` - Linux 系统
- `server-config` - 服务器配置
- `devops` - DevOps 和自动化
- `security` - 安全和加固
- `troubleshooting` - 故障排除

#### 难度级别

- `beginner` - 新手入门
- `intermediate` - 需要一定经验
- `advanced` - 面向有经验的用户

### 样式规范

#### 颜色、排版与交互

主题变量位于 `src/styles/theme.css`。浅色使用暖白页面与墨色文字，琥珀色用于导航状态和技术提示。深色沿用同样的层级。标题与正文采用 Geist，代码使用 IBM Plex Mono。

移动导航和正文目录使用 HTML 展开控件。代码使用独立的横向滚动面板，复制功能以可用的浏览器剪贴板为准。正文和主导航在禁用脚本时仍可阅读和使用。

### TypeScript 配置

项目使用严格的 TypeScript 配置：
- 继承 `astro/tsconfigs/strict`
- JSX 使用 `react-jsx` 转换
- 导入源为 `react`

### Astro 配置要点

- 使用 React 集成
- 启用站点地图插件
- Markdown 使用 `github-dark-default` Shiki 主题进行代码高亮
- 站点 URL: `https://serverhi.com`

---

## 配置文件说明

### config/site.json

站点元数据配置，包括：
- 站点名称、标题、描述、URL
- 内容焦点和目标受众
- 关键词（主关键词、次关键词、利基关键词）
- 每页文章数（默认 12）
- 相关文章数量（默认 3）

### src/styles/theme.css

定义公开页面的字体、版心、颜色及浅色和深色主题变量。

### config/categories.json

分类定义，每个分类包含：
- slug（URL 标识）
- name（显示名称）
- description（描述）
- color（主题色）
- icon（Emoji 图标）

### src/content/config.ts

内容集合 schema 定义，使用 Zod 验证：
- 基础字段：标题、描述、发布日期、封面图片等
- 教程特定字段：难度、估计时间、前置条件、操作系统兼容性

---

## 内容管理

### 文章 Frontmatter 必填字段

```typescript
{
  title: string,              // 文章标题
  description: string,        // SEO 描述
  pubDate: Date,              // 发布日期
  coverImage: Image,          // 封面图片
  coverImageAlt: string,      // 封面图片 Alt 文本
  category: enum,             // 分类（6个可选值）
  tags: string[],             // 标签数组
}
```

### 可选字段

```typescript
{
  updatedDate: Date,          // 更新日期
  author: string,             // 作者（默认：ServerHi Editorial Team）
  featured: boolean,          // 是否精选（默认：false）
  draft: boolean,             // 是否草稿（默认：false）
  difficulty: enum,           // 难度级别
  estimatedTime: string,      // 估计时间（如"15分钟"）
  prerequisites: string[],    // 前置条件
  osCompatibility: string[],  // 操作系统兼容性
}
```

---

## 组件说明

### SEO.astro

处理所有 SEO 相关的 meta 标签：
- 页面标题、描述
- Open Graph 标签
- Twitter Card
- 结构化数据（JSON-LD）
- 规范 URL

### Header.astro

网站导航头部，包含：
- Logo/站点名称
- 导航菜单
- 主题切换按钮
- 响应式菜单

### Footer.astro

网站页脚，包含：
- 版权信息
- 链接
- 社交媒体链接

### ArticleCard.astro

文章列表项卡片，显示：
- 封面图片
- 标题
- 描述
- 分类标签
- 发布日期
- 阅读时间

### TableOfContents.astro

基于已发布文章的小节锚点渲染桌面目录和移动端展开目录。外观偏好由页头控件和基础布局处理，仍使用 `localStorage` 的 `theme` 键。

## 部署

### 部署到 Vercel

```bash
npm install -g vercel
vercel
```

### 部署到 Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### 部署到 Cloudflare Pages

使用 Wrangler CLI 或连接 Git 仓库。

### 构建输出

构建后的静态文件位于 `dist/` 目录，包含：
- 所有 HTML 页面
- 优化的图片资源
- CSS 和 JS 文件
- Pagefind 搜索索引

---

## 注意事项

1. **图片处理**: 每篇文章都需要封面图片（推荐 `cover.jpg`，可选 `cover.svg`）
2. **搜索索引**: 每次构建后会自动生成 Pagefind 搜索索引
3. **主题默认**: 首次访问遵循系统的外观偏好
4. **代码高亮**: Markdown 代码块使用 GitHub Dark Default 主题
5. **内容验证**: 使用 Zod schema 验证文章 Frontmatter，确保数据一致性

---

## 常见任务

### 添加新分类

1. 编辑 `config/categories.json` 添加分类定义
2. 更新 `src/content/config.ts` 中的 category enum
3. 在 `src/lib/manual.ts` 添加专题摘要和已发布的任务入口

### 修改主题颜色

编辑 `src/styles/theme.css` 中对应的颜色变量。

### 更改站点元数据

编辑 `config/site.json` 中的相应字段。

### 禁用功能

编辑 `config/site.json` 中的 `features` 对象：
```json
{
  "features": {
    "search": false,
    "darkMode": false,
    "newsletter": false
  }
}
```

---

## 性能指标

- Lighthouse 评分：95+（所有指标）
- 首次内容绘制 (FCP): < 1s
- 可交互时间 (TTI): < 2s
- 所有页面预渲染（静态生成）
- 自动图片优化（WebP 转换）

---

## 浏览器支持

- Chrome（最新版）
- Firefox（最新版）
- Safari（最新版）
- Edge（最新版）
- 移动浏览器

---

## 开发最佳实践

1. **内容优先**: 所有教程使用 Markdown 编写，保持清晰的步骤和说明
2. **代码示例**: 提供实际可运行的代码示例，必要时添加解释
3. **命令清晰**: 使用命令块展示 shell 命令，明确执行顺序
4. **结构化内容**: 使用合适的标题层级（H2, H3 等）
5. **测试兼容性**: 标注教程适用的操作系统版本
6. **添加前置条件**: 列出读者需要具备的知识或工具
7. **提供故障排除**: 包含常见问题和解决方案

---

## 环境变量

当前项目不使用环境变量。如需添加，可以：
1. 创建 `.env` 文件
2. 使用 Astro 的环境变量 API
3. 确保 `.env` 文件包含在 `.gitignore` 中

---

## 相关资源

- [Astro 文档](https://docs.astro.build/)
- [React 文档](https://react.dev/)
- [Pagefind 文档](https://pagefind.app/)
- 项目 README: `/Users/m/Desktop/开发文档/docs/serverhi-site/README.md`