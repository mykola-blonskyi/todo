'use client';

import { useState, useTransition } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRouter } from '@shared/lib/i18n/navigation';
import { createListAction } from '@features/todos-list';
import { createTaskAction } from '@features/todo-list/actions';
import {
  updateLayoutAction,
  updatePaletteAction,
} from '@features/preferences/actions';
import { applyMode } from '@features/preferences/ModeToggle';
import {
  isLayout,
  isMode,
  isPalette,
  layouts,
  palettes,
  modes,
} from '@features/preferences/types';
import { applyPaletteClass } from '@features/preferences/PaletteSwitcher';

interface CommandLineProps {
  lists: { id: string; title: string }[];
  templates: { id: string; title: string }[];
}

// `:` command line. Commands map onto the same Server Actions the buttons
// use - this is a second way in, not a second implementation.
export function CommandLine({ lists, templates }: CommandLineProps) {
  const t = useTranslations('Terminal');
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { setTheme } = useTheme();
  const [value, setValue] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const helpText = [
    'help',
    'new <title>          ' + t('help.new'),
    'add <title>          ' + t('help.add'),
    'open <n|title>       ' + t('help.open'),
    'lists | recurring | categories | settings',
    `layout <${layouts.join('|')}>`,
    `palette <${palettes.join('|')}>`,
    `mode <${modes.join('|')}>`,
    t('help.keys'),
  ].join('\n');

  function run(raw: string) {
    const line = raw.trim().replace(/^:/, '');
    if (!line) return;
    const [command, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ').trim();
    setValue('');

    switch (command) {
      case 'help':
      case '?':
        setOutput(helpText);
        return;
      case 'lists':
        router.push('/');
        return;
      case 'recurring':
      case 'templates':
        router.push('/templates');
        return;
      case 'categories':
        router.push('/categories');
        return;
      case 'settings':
        router.push('/settings');
        return;
      case 'new': {
        if (!arg) return setOutput(t('usage', { usage: 'new <title>' }));
        const form = new FormData();
        form.set('title', arg);
        startTransition(async () => {
          await createListAction(form);
          setOutput(t('created', { title: arg }));
        });
        return;
      }
      case 'add': {
        if (!params.id) return setOutput(t('noListOpen'));
        if (!arg) return setOutput(t('usage', { usage: 'add <title>' }));
        const listId = params.id;
        const form = new FormData();
        form.set('title', arg);
        startTransition(async () => {
          await createTaskAction(listId, form);
          setOutput(t('added', { title: arg }));
        });
        return;
      }
      case 'open':
      case 'go': {
        const n = Number(arg);
        const byIndex =
          Number.isInteger(n) && n >= 1 ? lists[n - 1] : undefined;
        const byTitle =
          byIndex ??
          lists.find((list) =>
            list.title.toLowerCase().startsWith(arg.toLowerCase()),
          ) ??
          templates.find((tpl) =>
            tpl.title.toLowerCase().startsWith(arg.toLowerCase()),
          );
        if (!byTitle) return setOutput(t('notFound', { query: arg }));
        router.push(
          templates.includes(byTitle as (typeof templates)[number]) &&
            !lists.includes(byTitle as (typeof lists)[number])
            ? `/templates/${byTitle.id}`
            : `/lists/${byTitle.id}`,
        );
        return;
      }
      case 'layout':
        if (!isLayout(arg))
          return setOutput(
            t('usage', { usage: `layout <${layouts.join('|')}>` }),
          );
        startTransition(async () => {
          await updateLayoutAction(arg);
        });
        return;
      case 'palette':
        if (!isPalette(arg))
          return setOutput(
            t('usage', { usage: `palette <${palettes.join('|')}>` }),
          );
        applyPaletteClass(arg);
        startTransition(async () => {
          await updatePaletteAction(arg);
        });
        return;
      case 'mode':
        if (!isMode(arg))
          return setOutput(t('usage', { usage: `mode <${modes.join('|')}>` }));
        applyMode(arg, setTheme);
        return;
      default:
        setOutput(t('unknown', { command }));
    }
  }

  return (
    <div className="sticky bottom-0 z-20 border-t bg-card text-xs">
      {output ? (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap border-b px-4 py-2 text-muted-foreground">
          {output}
        </pre>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(value);
        }}
        className="flex items-center gap-2 px-4 py-1.5"
      >
        <span aria-hidden="true" className="font-bold text-primary">
          :
        </span>
        <input
          data-tui-command=""
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setValue('');
              setOutput(null);
              (event.target as HTMLInputElement).blur();
            }
          }}
          disabled={isPending}
          aria-label={t('commandLabel')}
          placeholder={t('commandPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent font-[inherit] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <span className="hidden text-muted-foreground sm:inline">
          {t('commandHint')}
        </span>
      </form>
    </div>
  );
}
