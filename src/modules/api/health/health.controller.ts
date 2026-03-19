import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult, MemoryHealthIndicator } from '@nestjs/terminus';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '@core/database/database.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@core/database/schemas';
import * as os from 'os';
import { ConfigService } from '@core/config/config.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

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
  ) {}

  @ApiOperation({ summary: 'Check application health' })
  @Get()
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // 1. Database: Hard Fail (If DB is down, app is useless)
      async () => {
        const dbUrl = this.configService.get('DATABASE_URL');
        const { hostname, port, pathname } = new URL(dbUrl);
        const name = pathname.replace('/', '');
        try {
          await this.db.execute('SELECT 1');
          return { database: { status: 'up', host: hostname, port, name } };
        } catch (e) {
          return { database: { status: 'down', host: hostname, message: (e as Error).message } };
        }
      },

      // 2. Memory: Hard Fail at 90% (Critical for OOM prevention)
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

      // 3. CPU: Informative (Diagnostics only)
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

      // 4. Process Metadata
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
