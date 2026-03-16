import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { version } from '../package.json';
import * as os from 'node:os';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly appService: AppService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Default welcome endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Check system health status' })
  check() {
    return this.health.check([
      // Memory usage + Built-in Health Check
      // We check that heap doesn't exceed 300MB while reporting current usage
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      () => {
        const usageInBytes = process.memoryUsage().heapUsed;
        return {
          memory_info: {
            status: 'up',
            current: `${(usageInBytes / 1024 / 1024).toFixed(2)} MB`,
          },
        };
      },

      // CPU / Processor usage
      () => {
        const cpus = os.cpus();
        const load = os.loadavg();
        return {
          cpu: {
            status: 'up',
            model: cpus[0].model,
            cores: cpus.length,
            loadAvg: load[0].toFixed(2),
          },
        };
      },

      // Process metadata
      () => ({
        process: {
          status: 'up',
          version: version,
          uptime: `${Math.floor(process.uptime())}s`,
          nodeVersion: process.version,
        },
      }),
    ]);
  }
}
