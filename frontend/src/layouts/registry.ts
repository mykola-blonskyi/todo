import type { Layout } from '@features/preferences';
import type { LayoutViews } from './types';
import { workspace } from './workspace';
import { board } from './board';
import { notebook } from './notebook';
import { pocket } from './pocket';
import { terminal } from './terminal';
import { ledger } from './ledger';

// Every layout implements every screen (types.ts LayoutViews). Adding a
// layout = a new folder here + an id in features/preferences/types.ts + the
// backend UserLayout enum + a [data-layout] block in globals.css.
const registry: Record<Layout, LayoutViews> = {
  workspace,
  board,
  notebook,
  pocket,
  terminal,
  ledger,
};

export function getLayoutViews(layout: Layout): LayoutViews {
  return registry[layout];
}
