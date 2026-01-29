import type { ConfiguratorState } from '../types';
import { DEFAULT_LAYOUT } from '../types';

export function generateCode(state: ConfiguratorState): string {
  const lines: string[] = ['<Gallery'];
  lines.push('  images={images}');

  const layoutParts: string[] = [];
  const layout = state.layout;

  if (layout.type !== DEFAULT_LAYOUT.type) {
    layoutParts.push(`type: '${layout.type}'`);
  }
  if (layout.gap !== DEFAULT_LAYOUT.gap) {
    layoutParts.push(`gap: ${layout.gap}`);
  }
  if (layout.columns !== DEFAULT_LAYOUT.columns) {
    const colValue = typeof layout.columns === 'string' ? `'${layout.columns}'` : layout.columns;
    layoutParts.push(`columns: ${colValue}`);
  }
  if (layout.type === 'justified' && layout.rowHeight && layout.rowHeight !== 240) {
    layoutParts.push(`rowHeight: ${layout.rowHeight}`);
  }

  if (layoutParts.length > 0) {
    lines.push(`  layout={{ ${layoutParts.join(', ')} }}`);
  }

  lines.push('  enableLightbox');

  if (state.theme) {
    const themeEntries = Object.entries(state.theme).filter(([, v]) => v !== undefined);
    if (themeEntries.length > 0) {
      lines.push('  // Apply theme via CSS custom properties on a parent element');
    }
  }

  lines.push('/>');

  return lines.join('\n');
}
