import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Command } from 'commander'
import openapiTS, { astToString } from 'openapi-typescript'

export interface GenerateOptions {
	/** URL of the remote OpenAPI spec (e.g., http://localhost:3000/oas.json) */
	url?: string
	/** Path to a local OpenAPI spec file */
	input?: string
	/** Output file path (default: ./magnet.d.ts) */
	output?: string
}

/**
 * Core generate logic — separated for testability.
 */
export async function runGenerate(options: GenerateOptions): Promise<void> {
	const output = options.output ?? './magnet.d.ts'
	const outputPath = resolve(process.cwd(), output)

	if (!options.url && !options.input) {
		throw new Error('Either --url or --input must be provided')
	}

	// options.input is guaranteed to be defined here — checked above
	const inputPath = options.input ?? ''
	const input: Parameters<typeof openapiTS>[0] = options.url
		? new URL(options.url)
		: pathToFileURL(resolve(process.cwd(), inputPath))

	const ast = await openapiTS(input)
	const content = astToString(ast)

	writeFileSync(outputPath, content, 'utf-8')
	console.log(`Types generated → ${outputPath}`)
}

/**
 * Build and return the CLI program (without calling .parseAsync so tests can inspect it).
 */
export function buildCLI(): Command {
	const program = new Command()

	program
		.name('magnet-client')
		.description('Magnet CMS client SDK tools')
		.version('0.1.0')

	program
		.command('generate')
		.description('Generate TypeScript types from a Magnet CMS OpenAPI spec')
		.option(
			'--url <url>',
			'URL of the OpenAPI spec endpoint (e.g., http://localhost:3000/oas.json)',
		)
		.option('--input <path>', 'Path to a local OpenAPI spec JSON/YAML file')
		.option(
			'-o, --output <path>',
			'Output file path for generated types',
			'./magnet.d.ts',
		)
		.addHelpText(
			'after',
			`
Examples:
  $ magnet-client generate --url http://localhost:3000/oas.json -o ./src/magnet.d.ts
  $ magnet-client generate --input ./openapi.json -o ./src/magnet.d.ts`,
		)
		.action(async (opts: GenerateOptions) => {
			try {
				await runGenerate(opts)
			} catch (err) {
				console.error('Error:', err instanceof Error ? err.message : err)
				process.exit(1)
			}
		})

	return program
}

// Entry point when run directly
if (
	process.argv[1]?.endsWith('cli.js') ||
	process.argv[1]?.endsWith('cli.ts')
) {
	buildCLI().parseAsync(process.argv)
}
