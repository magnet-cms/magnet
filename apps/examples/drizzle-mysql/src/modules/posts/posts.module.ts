import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Post } from './schemas/post.schema'

@Module({
	imports: [MagnetModule.forFeature([Post])],
})
export class PostsModule {}
