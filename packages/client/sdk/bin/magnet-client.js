#!/usr/bin/env node
import('../dist/cli.js').then(({ buildCLI }) => buildCLI().parseAsync(process.argv))
