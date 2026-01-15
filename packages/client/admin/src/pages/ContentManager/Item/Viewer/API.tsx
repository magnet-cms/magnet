import {
	Button,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Spinner,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@magnet/ui/components'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Globe } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ContentHeader } from '~/components/ContentHeader'
import { useAdapter } from '~/core/provider/MagnetProvider'
import { useContentManager } from '~/hooks/useContentManager'

interface LocaleOption {
	code: string
	name: string
}

const ContentManagerViewerAPI = () => {
	const { id, schema: _schemaName } = useParams()
	const adapter = useAdapter()
	const [activeEndpoint, setActiveEndpoint] = useState('get-all')
	const [selectedLocale, setSelectedLocale] = useState<string>('')
	const [copied, setCopied] = useState<Record<string, boolean>>({})

	const contentManager = useContentManager()
	if (!contentManager) return <Spinner />

	const { name, schemaMetadata } = contentManager

	// Fetch available locales from settings
	const { data: localesConfig } = useQuery({
		queryKey: ['settings', 'locales'],
		queryFn: () => adapter.settings.getLocales(),
	})

	// Convert configured locales to LocaleOption format
	const availableLocales: LocaleOption[] = useMemo(() => {
		if (!localesConfig) return []
		return localesConfig.configured.map((code) => {
			const locale = localesConfig.available.find((l) => l.value === code)
			return { code, name: locale?.key ?? code }
		})
	}, [localesConfig])

	const basePath = `/content-manager/${name.key}/${id}`

	const tabs = [
		{ label: 'Edit', to: '' },
		{ label: 'Versions', to: 'versions' },
		{ label: 'API', to: 'api' },
	]

	const properties =
		'properties' in schemaMetadata ? schemaMetadata.properties : []

	const apiBaseUrl = 'http://localhost:3000'

	const getMethodColor = (method: string) => {
		switch (method) {
			case 'GET':
				return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
			case 'POST':
				return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
			case 'PUT':
				return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
			case 'DELETE':
				return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
			default:
				return 'bg-muted text-muted-foreground'
		}
	}

	const getLocaleQueryString = () => {
		return selectedLocale ? `?locale=${selectedLocale}` : ''
	}

	const endpoints = [
		{
			id: 'get-all',
			name: 'Get All',
			method: 'GET',
			path: `/${name.key}s`,
			supportsLocale: true,
			description: `Retrieve a list of all ${name.title.toLowerCase()} items. Supports pagination and locale filtering.`,
			code: `fetch('${apiBaseUrl}/${name.key}s${selectedLocale ? `?locale=${selectedLocale}` : ''}', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
			parameters: [
				{
					name: 'locale',
					type: 'string',
					description: `Locale code to filter content (e.g., ${availableLocales.map((l) => l.code).join(', ') || 'en'}).`,
				},
				{
					name: 'limit',
					type: 'integer',
					description: 'Maximum number of items to return. Default 20.',
				},
				{
					name: 'offset',
					type: 'integer',
					description: 'Number of items to skip.',
				},
			],
		},
		{
			id: 'get-single',
			name: 'Get By ID',
			method: 'GET',
			path: `/${name.key}/{id}`,
			supportsLocale: true,
			description: `Retrieve a single ${name.title.toLowerCase()} by its unique identifier. Use the locale parameter to get localized content.`,
			code: `fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}${selectedLocale ? `?locale=${selectedLocale}` : ''}', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
			parameters: [
				{
					name: 'locale',
					type: 'string',
					description: `Locale code to retrieve localized content (e.g., ${availableLocales.map((l) => l.code).join(', ') || 'en'}).`,
				},
			],
		},
		{
			id: 'create',
			name: 'Create',
			method: 'POST',
			path: `/${name.key}`,
			supportsLocale: false,
			description: `Create a new ${name.title.toLowerCase()} entry with the provided data.`,
			code: `const newItem = {
${properties
	.filter((p) => p.required)
	.slice(0, 4)
	.map((p) => `  ${p.name}: "${p.type === 'string' ? 'value' : 'value'}"`)
	.join(',\n')}
};

fetch('${apiBaseUrl}/${name.key}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newItem)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
			parameters: [],
		},
		{
			id: 'update',
			name: 'Update',
			method: 'PUT',
			path: `/${name.key}/{id}`,
			supportsLocale: true,
			description: `Update an existing ${name.title.toLowerCase()} by its ID. Use the locale parameter to update localized content.`,
			code: `const updatedItem = {
${properties
	.slice(0, 3)
	.map((p) => `  ${p.name}: "updated value"`)
	.join(',\n')}
};

fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}${selectedLocale ? `?locale=${selectedLocale}` : ''}', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updatedItem)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
			parameters: [
				{
					name: 'locale',
					type: 'string',
					description: `Locale code to update localized content (e.g., ${availableLocales.map((l) => l.code).join(', ') || 'en'}).`,
				},
			],
		},
		{
			id: 'delete',
			name: 'Delete',
			method: 'DELETE',
			path: `/${name.key}/{id}`,
			supportsLocale: false,
			description: `Permanently delete a ${name.title.toLowerCase()} by its ID. This action cannot be undone.`,
			code: `fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
			parameters: [],
		},
	]

	const copyToClipboard = (text: string, key: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied({ ...copied, [key]: true })
			setTimeout(() => {
				setCopied((prev) => ({ ...prev, [key]: false }))
			}, 2000)
		})
	}

	const activeEndpointData = endpoints.find((e) => e.id === activeEndpoint)

	return (
		<div className="flex flex-col w-full min-h-0">
			<ContentHeader basePath={basePath} title={name.title} tabs={tabs} />

			<div className="flex-1 overflow-y-auto p-8">
				<div className="max-w-5xl mx-auto space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div>
							<h2 className="text-lg font-semibold text-foreground">
								API Reference
							</h2>
							<p className="text-sm text-muted-foreground mt-1">
								Use these API endpoints to interact with {name.title} content
								programmatically.
							</p>
						</div>

						{/* Locale Selector */}
						{availableLocales.length > 0 && (
							<div className="flex items-center gap-2">
								<Globe className="h-4 w-4 text-muted-foreground" />
								<Select
									value={selectedLocale}
									onValueChange={setSelectedLocale}
								>
									<SelectTrigger className="w-[180px] h-8 text-xs">
										<SelectValue placeholder="Select locale" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none" className="text-xs">
											No locale (default)
										</SelectItem>
										{availableLocales.map((locale) => (
											<SelectItem
												key={locale.code}
												value={locale.code}
												className="text-xs"
											>
												{locale.name} ({locale.code})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{/* Method Selector */}
					<div className="flex overflow-x-auto pb-1 border-b border-border">
						<div className="flex gap-1 p-1">
							{endpoints.map((endpoint) => (
								<button
									key={endpoint.id}
									type="button"
									onClick={() => setActiveEndpoint(endpoint.id)}
									className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
										activeEndpoint === endpoint.id
											? 'bg-muted text-foreground'
											: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
									}`}
								>
									{endpoint.method} {endpoint.name}
								</button>
							))}
						</div>
					</div>

					{/* Endpoint Card */}
					{activeEndpointData && (
						<div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
							{/* URL Bar */}
							<div className="flex items-center justify-between p-4 bg-muted/50 border-b border-border">
								<div className="flex items-center gap-3 font-mono text-xs w-full overflow-x-auto">
									<span
										className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getMethodColor(activeEndpointData.method)}`}
									>
										{activeEndpointData.method}
									</span>
									<span className="text-muted-foreground select-all">
										{apiBaseUrl}
										{activeEndpointData.path}
										{activeEndpointData.supportsLocale &&
										selectedLocale &&
										selectedLocale !== 'none'
											? getLocaleQueryString()
											: ''}
									</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="shrink-0 h-7 w-7 p-0"
									onClick={() =>
										copyToClipboard(
											`${apiBaseUrl}${activeEndpointData.path}${activeEndpointData.supportsLocale && selectedLocale && selectedLocale !== 'none' ? getLocaleQueryString() : ''}`,
											`url-${activeEndpointData.id}`,
										)
									}
								>
									{copied[`url-${activeEndpointData.id}`] ? (
										<Check className="h-3.5 w-3.5" />
									) : (
										<Copy className="h-3.5 w-3.5" />
									)}
								</Button>
							</div>

							{/* Description */}
							<div className="p-6 border-b border-border">
								<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
									Description
								</h4>
								<p className="text-sm text-foreground leading-relaxed">
									{activeEndpointData.description}
								</p>
								{activeEndpointData.supportsLocale && (
									<p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
										<Globe className="h-3 w-3" />
										This endpoint supports locale filtering.
									</p>
								)}
							</div>

							{/* Code Example */}
							<div className="bg-gray-950 dark:bg-gray-900 p-6 overflow-x-auto">
								<div className="flex items-center justify-between mb-3">
									<span className="text-xs font-medium text-gray-400">
										Example Request
										{selectedLocale &&
											selectedLocale !== 'none' &&
											activeEndpointData.supportsLocale && (
												<span className="ml-2 text-gray-500">
													(locale: {selectedLocale})
												</span>
											)}
									</span>
									<button
										type="button"
										onClick={() =>
											copyToClipboard(
												activeEndpointData.code,
												activeEndpointData.id,
											)
										}
										className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
									>
										{copied[activeEndpointData.id] ? (
											<>
												<Check className="w-3 h-3" />
												<span>Copied!</span>
											</>
										) : (
											<>
												<Copy className="w-3 h-3" />
												<span>Copy</span>
											</>
										)}
									</button>
								</div>
								<pre className="font-mono text-xs leading-6 text-gray-300">
									<code>{activeEndpointData.code}</code>
								</pre>
							</div>
						</div>
					)}

					{/* Parameters Table */}
					{activeEndpointData && activeEndpointData.parameters.length > 0 && (
						<div>
							<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
								Query Parameters
							</h4>
							<div className="border border-border rounded-lg overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/50">
											<TableHead className="text-xs font-medium">
												Parameter
											</TableHead>
											<TableHead className="text-xs font-medium">
												Type
											</TableHead>
											<TableHead className="text-xs font-medium">
												Description
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{activeEndpointData.parameters.map((param) => (
											<TableRow key={param.name}>
												<TableCell className="font-mono text-xs">
													{param.name}
												</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{param.type}
												</TableCell>
												<TableCell className="text-xs">
													{param.description}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default ContentManagerViewerAPI
