import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT,
  DEFAULT_PALETTE,
  isMode,
  layouts,
  paletteClassName,
  palettes,
  parseLayout,
  parsePalette,
} from '@/features/preferences/types';

describe('preferences/types', () => {
  it('parses known palette/layout ids and falls back on anything else', () => {
    expect(parsePalette('ocean')).toBe('ocean');
    expect(parsePalette('theme-rose')).toBe(DEFAULT_PALETTE);
    expect(parsePalette(undefined)).toBe(DEFAULT_PALETTE);
    expect(parseLayout('terminal')).toBe('terminal');
    expect(parseLayout('brutalist')).toBe(DEFAULT_LAYOUT);
    expect(parseLayout(42)).toBe(DEFAULT_LAYOUT);
  });

  it('maps palettes to the globals.css class convention (classic = no class)', () => {
    expect(paletteClassName('classic')).toBe('');
    expect(paletteClassName('rose')).toBe('theme-rose');
    expect(paletteClassName('graphite')).toBe('theme-graphite');
  });

  it('accepts light/dark/system as modes and nothing else', () => {
    expect(isMode('light')).toBe(true);
    expect(isMode('system')).toBe(true);
    expect(isMode('theme-rose')).toBe(false);
  });

  it('keeps the id lists in sync with the backend enums', () => {
    // Mirrors backend/prisma/schema.prisma UserPalette / UserLayout.
    expect([...palettes]).toEqual([
      'classic',
      'rose',
      'indigo',
      'ocean',
      'forest',
      'olive',
      'honey',
      'clay',
      'coral',
      'violet',
      'graphite',
      'paper',
    ]);
    expect([...layouts]).toEqual([
      'workspace',
      'board',
      'notebook',
      'pocket',
      'terminal',
      'ledger',
    ]);
  });
});
