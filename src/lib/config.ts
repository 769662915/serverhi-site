import siteConfig from '../../config/site.json';
import themeConfig from '../../config/theme.json';
import categoriesConfig from '../../config/categories.json';
import integrationsConfig from '../../config/integrations.json';

export const site = siteConfig;
export const theme = themeConfig;
export const categories = categoriesConfig.categories;
export const integrations = integrationsConfig;

export function getCategoryBySlug(slug: string) {
  return categories.find(cat => cat.slug === slug);
}

export function getCategoryColor(slug: string) {
  const category = getCategoryBySlug(slug);
  return category?.color || theme.colors.dark.primary;
}

export function getCategoryIcon(slug: string) {
  const category = getCategoryBySlug(slug);
  return category?.icon || '📄';
}
