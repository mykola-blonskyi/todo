'use client';

import { useEffect } from 'react';

// Vim-ish keys for the Terminal layout, driving the DOM the pages already
// render (no parallel state): rows opt in with `data-tui-row`, task action
// buttons carry `data-action`. Ignored while typing in a field.
//   j / k  move between rows      x  toggle done      e  edit
//   enter  open the row's link    d  delete           J/K reorder
//   :      focus the command line ?  show help
export function TuiKeys() {
  useEffect(() => {
    function rows(): HTMLElement[] {
      return Array.from(
        document.querySelectorAll<HTMLElement>('[data-tui-row]'),
      );
    }
    function current(): HTMLElement | null {
      const active = document.activeElement as HTMLElement | null;
      return active?.closest<HTMLElement>('[data-tui-row]') ?? null;
    }
    function clickAction(row: HTMLElement, action: string) {
      row
        .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
        ?.click();
    }

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const all = rows();
      const row = current();
      const index = row ? all.indexOf(row) : -1;

      switch (event.key) {
        case 'j':
        case 'ArrowDown': {
          const next = all[Math.min(index + 1, all.length - 1)];
          next?.focus();
          event.preventDefault();
          break;
        }
        case 'k':
        case 'ArrowUp': {
          const prev = all[Math.max(index - 1, 0)];
          prev?.focus();
          event.preventDefault();
          break;
        }
        case 'x':
        case ' ':
          if (row) {
            row.querySelector<HTMLElement>('[role="checkbox"]')?.click();
            event.preventDefault();
          }
          break;
        case 'e':
          if (row) clickAction(row, 'edit');
          break;
        case 'd':
          if (row) clickAction(row, 'delete');
          break;
        case 'J':
          if (row) clickAction(row, 'move-down');
          break;
        case 'K':
          if (row) clickAction(row, 'move-up');
          break;
        case 'Enter':
          if (row) {
            const link = row.matches('a')
              ? row
              : row.querySelector<HTMLElement>('a');
            link?.click();
          }
          break;
        case ':':
        case '?': {
          const input =
            document.querySelector<HTMLInputElement>('[data-tui-command]');
          if (input) {
            input.focus();
            if (event.key === '?') input.value = 'help';
            event.preventDefault();
          }
          break;
        }
        default:
          return;
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return null;
}
