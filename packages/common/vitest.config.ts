import { nestConfig } from '@repo/vitest/base'
import { mergeConfig } from 'vitest/config'

export default mergeConfig(nestConfig, {
	test: {
		coverage: {
			// Exclude out-of-scope directories: types (type-only files with no runtime logic),
			// model (deferred to a separate plan), and exceptions (trivial wrappers).
			exclude: ['src/types/**', 'src/model/**', 'src/exceptions/**'],
			thresholds: {
				lines: 80,
				branches: 75,
			},
		},
	},
})
