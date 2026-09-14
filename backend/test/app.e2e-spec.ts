import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

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

  it('/health (GET) reports ok while the database answers', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('/health (GET) reports unavailable when the database does not answer', async () => {
    jest
      .spyOn(app.get(PrismaService), '$queryRaw')
      .mockRejectedValue(new Error('connection refused'));

    await request(app.getHttpServer()).get('/health').expect(503);
  });
});
