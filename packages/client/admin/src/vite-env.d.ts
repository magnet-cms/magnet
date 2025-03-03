/// <reference types="vite/client" />

interface ImportMetaGlob {
	[key: string]: () => Promise<any>
}

interface ImportMeta {
	glob<T = any>(
		pattern: string,
		options?: { eager?: boolean },
	): Record<string, T | (() => Promise<T>)>
}
