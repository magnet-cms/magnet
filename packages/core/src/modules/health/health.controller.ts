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
		return this.health.check([
			// Memory heap shouldn't exceed 300MB
			() => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

			// Available disk space should be at least 500MB
			() =>
				this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.5 }),
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
		return this.health.check([
			() =>
				this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.5 }),
		])
	}
}
