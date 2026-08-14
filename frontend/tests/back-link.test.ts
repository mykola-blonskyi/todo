import { describe, expect, it } from 'vitest';
import { buildBackLinkHref } from '@/features/todo-list/back-link';

describe('buildBackLinkHref', () => {
  it('links to the categoryId filter when the List is categorized', () => {
    expect(buildBackLinkHref({ id: 'cat-1' })).toBe('/?categoryId=cat-1');
  });

  it('links to the uncategorized filter when the List has no category', () => {
    expect(buildBackLinkHref(null)).toBe('/?uncategorized=true');
  });
});
