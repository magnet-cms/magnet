export function generateMain(): string {
  return `import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	)

	// CORS configuration for admin UI
	app.enableCors({
		origin: ['http://localhost:3000', 'http://localhost:3001'],
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		allowedHeaders:
			'Content-Type,Authorization,X-Magnet-E2E-Worker',
		credentials: true,
	})

	const port = process.env.PORT ?? 3000
	await app.listen(port)
	console.log(\`Application is running on: http://localhost:\${port}\`)
}

bootstrap().catch((error) => {
	console.error('Failed to start application:', error)
	process.exit(1)
})
`
}
