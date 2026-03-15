import ansis from 'ansis'
import type { ProjectConfig } from '../types.js'

export function showSuccessMessage(config: ProjectConfig): void {
	const { projectName, database, packageManager } = config

	const runCmd = packageManager === 'npm' ? 'npm run' : packageManager

	const dbAdminUi =
		database === 'mongoose'
			? 'Mongo Express: http://localhost:8081'
			: 'pgAdmin: http://localhost:5050'

	console.log()
	console.log(ansis.green.bold('Success!'), 'Your Magnet CMS project is ready.')
	console.log()
	console.log(ansis.bold('Next steps:'))
	console.log()
	console.log(ansis.cyan(`  cd ${projectName}`))
	console.log(ansis.cyan(`  ${runCmd} dev`))
	console.log()
	console.log(
		ansis.dim(
			'This starts Docker services, waits for the database, and launches the app.',
		),
	)
	console.log(ansis.dim('Admin UI:    http://localhost:3000/admin'))
	console.log(ansis.dim(`DB Admin:    ${dbAdminUi}`))
	console.log()
	console.log(ansis.dim('Happy building!'))
	console.log()
}

export function showErrorMessage(error: unknown): void {
	console.log()
	console.log(
		ansis.red.bold('Error:'),
		error instanceof Error ? error.message : String(error),
	)
	console.log()
}

export function showWarning(message: string): void {
	console.log(ansis.yellow('Warning:'), message)
}

export function showInfo(message: string): void {
	console.log(ansis.blue('Info:'), message)
}
