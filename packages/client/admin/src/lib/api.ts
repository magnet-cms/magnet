import { TOKEN_KEY } from '~/hooks/useAuth'

export const API_URL = 'http://localhost:3000'

export const fetcher = async <T>(
	url: string,
	options?: RequestInit,
): Promise<T> => {
	const token = localStorage.getItem(TOKEN_KEY)

	const res = await fetch(`${API_URL}${url}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options?.headers,
		},
	})

	if (!res.ok) {
		throw new Error(`Error ${res.status}: ${res.statusText}`)
	}

	return res.json()
}
