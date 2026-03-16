import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // 1. Tell the testing module to use the FastifyAdapter
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();

    // 2. Fastify requires the instance to be fully ready before accepting requests
    await app.getHttpAdapter().getInstance().ready();
  });

  // 3. Clean up the Fastify instance after tests to prevent Jest from hanging
  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'); // Make sure this matches what AppService actually returns
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: { body: { status: string } }) => {
        if (res.body.status !== 'ok') throw new Error('Status not ok');
      });
  });
});
