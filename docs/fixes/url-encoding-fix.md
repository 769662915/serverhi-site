# URL 编码修复记录

## 问题描述

**日期**: 2026-02-08

**错误**: Cloudflare 部署时出现 "Missing parameter: slug" 错误

**影响范围**: 包含特殊字符的标签（如 "CI/CD"）导致路由失败

## 根本原因

标签名称中包含特殊字符（如斜杠 `/`、空格等）时，直接用作 URL 路径会导致路由解析错误。例如：
- `CI/CD` → `/tag/CI/CD` ❌（被解析为多级路径）
- `service management` → `/tag/service management` ❌（空格未编码）

## 解决方案

### 1. 标签路由页面 (`src/pages/tag/[slug].astro`)

**修改前**:
```typescript
export async function getStaticPaths() {
  const allPosts = await getAllPosts();
  const tags = new Set<string>();

  allPosts.forEach((post) => {
    post.data.tags.forEach((tag) => tags.add(tag));
  });

  return Array.from(tags).map(tag => ({
    params: { slug: tag },
  }));
}

const { slug } = Astro.params;
const posts = await getPostsByTag(slug);
```

**修改后**:
```typescript
export async function getStaticPaths() {
  const allPosts = await getAllPosts();
  const tags = new Set<string>();

  allPosts.forEach((post) => {
    post.data.tags.forEach((tag) => tags.add(tag));
  });

  return Array.from(tags).map(tag => ({
    params: { slug: encodeURIComponent(tag) },
    props: { originalTag: tag }
  }));
}

const { slug } = Astro.params;
const { originalTag } = Astro.props;
const decodedSlug = originalTag || decodeURIComponent(slug);
const posts = await getPostsByTag(decodedSlug);
```

**关键点**:
- 使用 `encodeURIComponent()` 编码标签作为 URL 参数
- 通过 `props` 传递原始标签名称
- 在组件中使用原始标签或解码后的 slug 进行查询

### 2. 文章页面标签链接 (`src/pages/posts/[slug].astro`)

**修改**:
```typescript
// 标签链接
{tags.map(tag => (
  <a href={`/tag/${encodeURIComponent(tag)}`} class="tag terminal-hover">
    #{tag}
  </a>
))}

// 分类链接
<a href={`/category/${encodeURIComponent(category)}`} class="category-badge">
  {category}
</a>

// 面包屑
const breadcrumbItems = [
  { label: 'Tutorials', href: '/posts' },
  { label: categoryInfo?.name || category, href: `/category/${encodeURIComponent(category)}` },
  { label: title, href: `/posts/${post.slug}` }
];
```

## 验证结果

构建成功后，标签被正确编码：
- `CI/CD` → `/tag/CI%2FCD/index.html` ✅
- `service management` → `/tag/service%20management/index.html` ✅
- `Ubuntu LTS` → `/tag/Ubuntu%20LTS/index.html` ✅
- `Reverse Proxy` → `/tag/Reverse%20Proxy/index.html` ✅

## 最佳实践

### 何时需要 URL 编码

在以下情况下必须使用 `encodeURIComponent()`:

1. **动态路由参数**: 任何用作 URL 路径的动态值
2. **用户输入内容**: 标签、分类、搜索关键词等
3. **包含特殊字符**: 空格、斜杠、问号、井号等

### 编码规则

```typescript
// ✅ 正确：编码动态值
<a href={`/tag/${encodeURIComponent(tag)}`}>

// ❌ 错误：直接使用动态值
<a href={`/tag/${tag}`}>

// ✅ 正确：静态路径不需要编码
<a href="/posts">

// ✅ 正确：在 getStaticPaths 中编码
return tags.map(tag => ({
  params: { slug: encodeURIComponent(tag) },
  props: { originalTag: tag }
}));
```

### 解码规则

```typescript
// 在组件中获取原始值
const { slug } = Astro.params;
const { originalTag } = Astro.props;

// 优先使用 props 传递的原始值，fallback 到解码
const decodedSlug = originalTag || decodeURIComponent(slug);

// 使用解码后的值进行查询和显示
const posts = await getPostsByTag(decodedSlug);
```

## 相关提交

- `9693dab` - fix(tag): 修复标签路由中特殊字符导致的部署错误
- `5b1afdd` - fix(posts): 对标签和分类链接进行 URL 编码

## 参考资料

- [MDN: encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [Astro Dynamic Routes](https://docs.astro.build/en/core-concepts/routing/#dynamic-routes)
