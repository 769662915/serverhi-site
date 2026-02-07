export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function getDifficultyColor(difficulty?: string): string {
  switch (difficulty) {
    case 'beginner':
      return '#00ff00';
    case 'intermediate':
      return '#ff9500';
    case 'advanced':
      return '#ff4444';
    default:
      return '#8b949e';
  }
}

export function getDifficultyLabel(difficulty?: string): string {
  if (!difficulty) return '';
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}
