import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Test9DB0253CController } from './test9db0253c.controller'
import { Test9DB0253C } from './test9db0253c.schema'
import { Test9DB0253CService } from './test9db0253c.service'

@Module({
	imports: [MagnetModule.forFeature(Test9DB0253C)],
	controllers: [Test9DB0253CController],
	providers: [Test9DB0253CService],
})
export class Test9DB0253CModule {}
