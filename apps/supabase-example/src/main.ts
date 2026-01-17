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
	console.log(`Supabase Example running on http://localhost:${port}`)
	console.log('Supabase Studio: http://localhost:3010')
}

bootstrap()
