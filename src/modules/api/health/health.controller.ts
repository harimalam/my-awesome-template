import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult, MemoryHealthIndicator } from '@nestjs/terminus';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '@core/database/database.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@core/database/schemas';
import * as os from 'os';
import { ConfigService } from '@core/config/config.service';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisService } from '@core/redis/redis.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('System')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  @ApiOperation({ summary: 'Check application health' })
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto })
  async checkLiveness(): Promise<HealthResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      const result = await this.check();

      return {
        status: result.status === 'ok' ? 'ok' : 'error',
        timestamp,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp,
      });
    }
  }

  @ApiOperation({ summary: 'Check application health details' })
  @Get('details')
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database: Hard Fail (If DB is down, app is useless)
      async () => {
        const dbUrl = this.configService.get('DATABASE_URL');
        const { hostname, port, pathname } = new URL(dbUrl);
        const name = pathname.replace('/', '');
        try {
          // In postgres.js, the result IS the array of rows.
          const res = (await this.db.execute('SELECT version() AS version')) as unknown as Array<{ version: string }>;

          // Access the first element directly, no .rows property
          const version = res[0]?.version ?? 'unknown';

          await this.db.execute('SELECT 1');

          return { database: { status: 'up', host: hostname, port, name, version: `v${version}` } };
        } catch (e) {
          return { database: { status: 'down', host: hostname, message: (e as Error).message } };
        }
      },

      // Redis: Check if redis is up
      async () => {
        try {
          const info = await this.redisService.redis.info('server'); // raw info string
          const versionMatch = info.match(/redis_version:(.+)/);
          const version = versionMatch ? versionMatch[1] : 'unknown';
          const result = await this.redisService.ping();

          const host = this.configService.get('REDIS_HOST');
          const port = this.configService.get('REDIS_PORT');

          if (result !== 'PONG') {
            throw new Error('Unexpected ping response');
          }

          return {
            redis: {
              status: 'up',
              host,
              port,
              version: `v${version}`,
            },
          };
        } catch (e) {
          return {
            redis: {
              status: 'down',
              message: (e as Error).message,
            },
          };
        }
      },

      // Memory: Hard Fail at 90% (Critical for OOM prevention)
      async () => {
        const total = os.totalmem();
        const threshold = total * 0.9;
        const rss = process.memoryUsage().rss;

        try {
          await this.memory.checkRSS('memory_rss', threshold);
          return {
            memory: {
              status: 'up',
              current: `${(rss / 1024 / 1024).toFixed(2)} MB`,
              limit: `${(threshold / 1024 / 1024).toFixed(2)} MB`,
            },
          };
        } catch {
          return {
            memory: {
              status: 'down',
              current: `${(rss / 1024 / 1024).toFixed(2)} MB`,
              message: 'Memory usage exceeds 90% threshold',
            },
          };
        }
      },

      // CPU: Informative (Diagnostics only)
      () => {
        const load = os.loadavg()[0];
        const cores = os.cpus().length;
        const loadFactor = load / cores;

        return {
          cpu: {
            status: 'up',
            load: load.toFixed(2),
            cores: cores,
            pressure: `${(loadFactor * 100).toFixed(0)}%`,
            level: loadFactor > 1 ? 'high' : 'normal',
          },
        };
      },

      // Process Metadata
      () => ({
        process: {
          status: 'up',
          uptime: `${Math.floor(process.uptime())}s`,
          node: process.version,
          platform: process.platform,
        },
      }),
    ]);
  }
}
