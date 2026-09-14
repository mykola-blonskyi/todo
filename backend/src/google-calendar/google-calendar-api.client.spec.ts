import { GoogleCalendarApiClient } from './google-calendar-api.client';

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}

describe('GoogleCalendarApiClient.upsertEvent', () => {
  let client: GoogleCalendarApiClient;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    client = new GoogleCalendarApiClient();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function methodsCalled() {
    const calls = fetchMock.mock.calls as [unknown, RequestInit | undefined][];
    return calls.map(([, init]) => init?.method);
  }

  it('patches the stored event when there is one', async () => {
    fetchMock.mockResolvedValue(response(200, { id: 'event-1' }));

    const result = await client.upsertEvent('token', {
      eventId: 'event-1',
      summary: 'Groceries',
      description: '',
      dueDate: '2026-03-10',
    });

    expect(methodsCalled()).toEqual(['PATCH']);
    expect(result.eventId).toBe('event-1');
  });

  it.each([404, 410])(
    'creates a fresh event when Google answers %s to the patch',
    async (status) => {
      fetchMock
        .mockResolvedValueOnce(response(status, { error: { message: 'gone' } }))
        .mockResolvedValueOnce(response(200, { id: 'event-2' }));

      const result = await client.upsertEvent('token', {
        eventId: 'event-1',
        summary: 'Groceries',
        description: '',
        dueDate: '2026-03-10',
      });

      expect(methodsCalled()).toEqual(['PATCH', 'POST']);
      expect(result.eventId).toBe('event-2');
    },
  );

  it('does not retry a failure that is not a missing event', async () => {
    fetchMock.mockResolvedValue(
      response(500, { error: { message: 'backend error' } }),
    );

    await expect(
      client.upsertEvent('token', {
        eventId: 'event-1',
        summary: 'Groceries',
        description: '',
        dueDate: '2026-03-10',
      }),
    ).rejects.toThrow(/500/);
    expect(methodsCalled()).toEqual(['PATCH']);
  });

  it('bounds every request, so a stalled Google cannot hold the connection', async () => {
    fetchMock.mockResolvedValue(response(200, { id: 'event-1' }));

    await client.upsertEvent('token', {
      summary: 'Groceries',
      description: '',
      dueDate: '2026-03-10',
    });

    const calls = fetchMock.mock.calls as [unknown, RequestInit | undefined][];
    expect(calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
