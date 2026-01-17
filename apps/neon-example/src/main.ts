import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	// Enable CORS for admin UI
	app.enableCors({
		origin: ['http://localhost:3001', 'http://localhost:5173'],
		credentials: true,
	})

	const port = process.env.PORT || 3000
	await app.listen(port)
	console.log(`Neon Example running on http://localhost:${port}`)
}

bootstrap()
