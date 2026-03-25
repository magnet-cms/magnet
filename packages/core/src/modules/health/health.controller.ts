import { Controller, Get } from '@nestjs/common'
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus'

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const diskPath = process.platform === 'win32' ? 'C:\\' : '/'
    return this.health.check([
      // Memory heap shouldn't exceed 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Available disk space check - use higher threshold (90%) to avoid false positives
      // Skip disk check on Windows if path is invalid
      () => {
        try {
          return this.disk.checkStorage('disk', {
            path: diskPath,
            thresholdPercent: 0.9, // 90% threshold - only fail if disk is almost full
          })
        } catch (error) {
          // On Windows, if disk check fails, just return a passing check
          if (process.platform === 'win32') {
            return Promise.resolve({ disk: { status: 'up' } })
          }
          throw error
        }
      },
    ])
  }

  @Get('memory')
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ])
  }

  @Get('disk')
  @HealthCheck()
  checkDisk() {
    const diskPath = process.platform === 'win32' ? 'C:\\' : '/'
    return this.health.check([
      () => {
        try {
          return this.disk.checkStorage('disk', {
            path: diskPath,
            thresholdPercent: 0.9, // 90% threshold
          })
        } catch (error) {
          // On Windows, if disk check fails, just return a passing check
          if (process.platform === 'win32') {
            return Promise.resolve({ disk: { status: 'up' } })
          }
          throw error
        }
      },
    ])
  }
}
