/**
 * @type {import('tsup').Options}
 */
const config = {
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  treeshake: true,
  clean: true,
  dts: true,
}

export default config
