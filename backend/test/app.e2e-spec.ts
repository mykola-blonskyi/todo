import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // The catch-all that hides resolver internals used to swallow GraphQL's own
  // validation errors too, so a caller asking for a field that does not exist
  // was told the server had failed.
  it('tells a caller their query was rejected, rather than reporting a server fault', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set({ 'x-user-id': 'hub-1', 'x-user-email': 'owner@example.com' })
      .send({ query: '{ me { notAField } }' });

    const body = res.body as {
      errors: { message: string; extensions: { code: string } }[];
    };
    expect(body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect(body.errors[0].message).toContain('notAField');
  });

  afterEach(async () => {
    await app.close();
  });
});
