import { MagnetModuleOptions } from '@magnet-cms/common'

export const initOptions = (
	options?: MagnetModuleOptions,
): MagnetModuleOptions => ({
	jwt: {
		secret: options?.jwt?.secret || String(process.env.JWT_SECRET),
	},
	db: options?.db || {
		uri: process.env.DB_URI || 'mongodb://localhost:27017/magnet',
	},
	auth: options?.auth || {
		strategy: 'jwt',
	},
	internationalization: options?.internationalization || {
		locales: ['en'],
		defaultLocale: 'en',
	},
	plugins: options?.plugins || [],
	storage: options?.storage,
	admin: options?.admin,
})
