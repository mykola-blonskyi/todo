import { testDb } from './setup/db';

describe('Prisma schema + Postgres connection', () => {
  it('creates and reads back a User', async () => {
    const user = await testDb.user.create({
      data: { hubUserId: 'hub-1', email: 'owner@example.com', name: 'Owner' },
    });

    const found = await testDb.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(found.email).toBe('owner@example.com');
    expect(found.locale).toBe('en');
    expect(found.theme).toBe('light');
  });

  it('enforces the unique email constraint', async () => {
    await testDb.user.create({
      data: { hubUserId: 'hub-1', email: 'dup@example.com' },
    });

    await expect(
      testDb.user.create({
        data: { hubUserId: 'hub-2', email: 'dup@example.com' },
      }),
    ).rejects.toThrow();
  });

  it('cascades List deletion to its Tasks', async () => {
    const user = await testDb.user.create({
      data: { hubUserId: 'hub-1', email: 'owner@example.com' },
    });
    const list = await testDb.list.create({
      data: { title: 'Groceries', ownerId: user.id },
    });
    const task = await testDb.task.create({
      data: { title: 'Milk', listId: list.id },
    });

    await testDb.list.delete({ where: { id: list.id } });

    await expect(
      testDb.task.findUnique({ where: { id: task.id } }),
    ).resolves.toBeNull();
  });
});
