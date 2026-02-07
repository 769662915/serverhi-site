# ServerHi Development Guide

This document provides detailed information for developers working on the ServerHi project.

## Project Overview

ServerHi is a static site built with Astro 5.0, featuring a unique terminal aesthetic design. The site focuses on Linux server tutorials, Docker guides, and DevOps content.

## Design System

### Color Palette

**Dark Theme (Default)**:
- Primary: `#00ff00` (Terminal Green)
- Secondary: `#ff9500` (Orange)
- Background: `#0d1117` (Dark Gray)
- Surface: `#161b22` (Lighter Dark)
- Text: `#e6edf3` (Light Gray)
- Border: `#30363d` (Medium Gray)

**Light Theme**:
- Primary: `#00d900` (Green)
- Secondary: `#ff8c00` (Orange)
- Background: `#f5f5f5` (Light Gray)
- Surface: `#ffffff` (White)
- Text: `#1a1a1a` (Dark)

### Typography

- **Headings**: Space Mono (monospace, 400/700)
- **Body**: Work Sans (sans-serif, 400/500/600)
- **Code**: Space Mono (monospace, 400/700)

### Spacing Scale

- `0.25rem` (4px)
- `0.5rem` (8px)
- `0.75rem` (12px)
- `1rem` (16px)
- `1.5rem` (24px)
- `2rem` (32px)
- `3rem` (48px)
- `4rem` (64px)

### Border Radius

- Small: `2px`
- Medium: `4px`
- Large: `6px`
- Extra Large: `8px`

## Component Architecture

### Layout Components

**BaseLayout.astro**
- Main layout wrapper
- Includes SEO, Header, Footer
- Handles theme initialization

**ArticleLayout.astro** (if needed)
- Specialized layout for blog posts
- Includes article metadata
- Related posts section

### UI Components

**Header.astro**
- Site navigation
- Logo with terminal brackets
- Theme toggle
- Responsive menu

**Footer.astro**
- Site links
- Category links
- Copyright information

**ArticleCard.astro**
- Post preview card
- Category badge
- Difficulty indicator
- Reading time
- Tags

**ThemeToggle.tsx**
- React component for theme switching
- Persists preference to localStorage
- Smooth transitions

### Utility Components

**SEO.astro**
- Meta tags
- Open Graph
- Twitter Cards
- Structured data

## Content Management

### Content Schema

Located in `src/content/config.ts`:

```typescript
{
  title: string
  description: string
  pubDate: Date
  updatedDate?: Date
  coverImage: ImageFunction
  coverImageAlt: string
  category: enum
  tags: string[]
  author: string
  featured: boolean
  draft: boolean
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime?: string
  prerequisites?: string[]
  osCompatibility?: string[]
}
```

### Content Guidelines

1. **Title**: 50-60 characters, include main keyword
2. **Description**: 120-160 characters, SEO optimized
3. **Cover Image**: 1200x630px, < 500KB
4. **Content Length**: 1500+ words
5. **Code Blocks**: Use proper syntax highlighting
6. **Headings**: Use H2 for main sections, H3 for subsections

### Writing Style

- Clear and practical
- Step-by-step instructions
- Include code examples
- Explain the "why" not just the "how"
- Use terminal-style formatting for commands
- Avoid AI writing clichés (see CONTENT_GUIDE.md)

## Styling Guidelines

### CSS Architecture

1. **Global Styles** (`global.css`)
   - Imports all style modules
   - Google Fonts import

2. **Base Styles** (`base.css`)
   - Reset and normalize
   - Typography base
   - Utility classes

3. **Theme Styles** (`theme.css`)
   - CSS variables
   - Theme-specific styles
   - Terminal effects

4. **Animations** (`animations.css`)
   - Keyframe animations
   - Transition effects
   - Loading states

### CSS Naming Conventions

- Use kebab-case for class names
- Prefix component-specific classes
- Use semantic names

```css
/* Good */
.article-card { }
.terminal-window { }
.category-badge { }

/* Avoid */
.card1 { }
.green-box { }
.thing { }
```

### Responsive Design

Mobile-first approach:

```css
/* Mobile (default) */
.element { }

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1280px) { }
```

## Performance Optimization

### Image Optimization

- Use Astro's built-in image optimization
- Provide `alt` text for all images
- Use appropriate formats (WebP preferred)
- Lazy load images below the fold

### Code Splitting

- Components are automatically code-split
- Use dynamic imports for heavy components
- Minimize JavaScript bundle size

### Caching Strategy

- Static assets: 1 year cache
- HTML pages: No cache (revalidate)
- API responses: Appropriate cache headers

## SEO Best Practices

### On-Page SEO

- Unique title and description per page
- Proper heading hierarchy (H1 → H2 → H3)
- Internal linking between related posts
- Descriptive URLs (slugs)
- Alt text for images

### Technical SEO

- Sitemap generation (automatic)
- Robots.txt configuration
- Canonical URLs
- Structured data (JSON-LD)
- Fast page load times

### Content SEO

- Keyword research before writing
- Natural keyword placement
- Long-form content (1500+ words)
- Regular content updates
- External links to authoritative sources

## Testing

### Manual Testing Checklist

- [ ] All pages load correctly
- [ ] Navigation works on all pages
- [ ] Theme toggle functions properly
- [ ] Images load and display correctly
- [ ] Links are not broken
- [ ] Forms submit successfully
- [ ] Mobile responsive design works
- [ ] Search functionality works
- [ ] SEO meta tags are present

### Browser Testing

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

### Performance Testing

Use Lighthouse to check:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

## Deployment

### Pre-Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] Test production build locally
- [ ] Check all environment variables
- [ ] Verify sitemap generation
- [ ] Test on staging environment
- [ ] Run Lighthouse audit
- [ ] Check broken links

### Environment Variables

```bash
# .env.example
PUBLIC_ADSENSE_CLIENT_ID=
PUBLIC_GA_MEASUREMENT_ID=
```

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production
npm run preview

# Type checking
npm run astro check
```

## Troubleshooting

### Common Issues

**Build Fails**
- Check Node.js version (18+)
- Clear `node_modules` and reinstall
- Check for TypeScript errors

**Images Not Loading**
- Verify image paths are correct
- Check image file sizes
- Ensure images are in correct format

**Styles Not Applying**
- Check CSS import order
- Verify CSS variable names
- Clear browser cache

**Theme Toggle Not Working**
- Check localStorage permissions
- Verify JavaScript is enabled
- Check console for errors

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation
- `style/ui-improvement` - Style changes

### Commit Messages

Follow conventional commits:

```
feat: add search functionality
fix: resolve mobile menu issue
docs: update README
style: improve button hover effect
refactor: simplify post query logic
```

### Pull Request Process

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Update documentation
5. Submit PR with description
6. Address review comments
7. Merge after approval

## Resources

### Documentation

- [Astro Docs](https://docs.astro.build/)
- [React Docs](https://react.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)

### Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Can I Use](https://caniuse.com/)

### Design Inspiration

- Terminal UI designs
- Hacker aesthetic
- Retro computing interfaces

---

**Questions?** Open an issue or contact the team.
