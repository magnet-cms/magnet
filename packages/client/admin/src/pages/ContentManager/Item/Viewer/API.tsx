import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Spinner,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@magnet/ui/components'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Head } from '~/components/Head'
import { useContentManager } from '~/hooks/useContentManager'

const ContentManagerViewerAPI = () => {
	const { id, schema: schemaName } = useParams()
	const [copied, setCopied] = useState<Record<string, boolean>>({})

	const contentManager = useContentManager()
	if (!contentManager) return <Spinner />

	const { name, schemaMetadata } = contentManager

	// Base API URL - should come from config
	const apiBaseUrl = 'http://localhost:3000'

	// Define endpoints
	const endpoints = [
		{
			id: 'get-all',
			name: 'Get All',
			method: 'GET',
			path: `/${name.key}s`,
			description: `Retrieve all ${name.title.toLowerCase()} items`,
			code: `fetch('${apiBaseUrl}/${name.key}s')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
		{
			id: 'get-single',
			name: 'Get By ID',
			method: 'GET',
			path: `/${name.key}/{id}`,
			description: `Retrieve a single ${name.title.toLowerCase()} by ID`,
			code: `fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
		{
			id: 'get-locale',
			name: 'Get With Locale',
			method: 'GET',
			path: `/${name.key}/{id}?locale={locale}`,
			description: `Retrieve a ${name.title.toLowerCase()} with a specific locale`,
			code: `fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}?locale=es')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
		{
			id: 'create',
			name: 'Create',
			method: 'POST',
			path: `/${name.key}`,
			description: `Create a new ${name.title.toLowerCase()}`,
			code: `const newItem = {
  // Required fields
${schemaMetadata.properties
	.filter((p) => p.required)
	.map((p) => `  ${p.name}: "${p.type === 'string' ? 'value' : 'value'}"`)
	.join(',\n')}
};

fetch('${apiBaseUrl}/${name.key}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newItem),
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
		{
			id: 'update',
			name: 'Update',
			method: 'PUT',
			path: `/${name.key}/{id}`,
			description: `Update an existing ${name.title.toLowerCase()}`,
			code: `const updatedItem = {
  // Fields to update
${schemaMetadata.properties
	.slice(0, 3)
	.map(
		(p) =>
			`  ${p.name}: "${p.type === 'string' ? 'updated value' : 'updated value'}"`,
	)
	.join(',\n')}
};

fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updatedItem),
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
		{
			id: 'update-locale',
			name: 'Update With Locale',
			method: 'PUT',
			path: `/${name.key}/{id}?locale={locale}`,
			description: `Update a ${name.title.toLowerCase()} with a specific locale`,
			code: `const localizedItem = {
  // Fields to update with localization
${
	schemaMetadata.properties
		.filter(
			(p) =>
				p.validations?.some((v) => v.name === 'intl') || p.ui?.type === 'intl',
		)
		.slice(0, 3)
		.map((p) => `  ${p.name}: "Localización en español"`)
		.join(',\n') || '  // No localizable fields found'
}
};

fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}?locale=es', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(localizedItem),
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
		{
			id: 'delete',
			name: 'Delete',
			method: 'DELETE',
			path: `/${name.key}/{id}`,
			description: `Delete a ${name.title.toLowerCase()}`,
			code: `fetch('${apiBaseUrl}/${name.key}/${id || '{id}'}', {
  method: 'DELETE',
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
		{
			id: 'versions',
			name: 'Get Versions',
			method: 'GET',
			path: `/history/versions/{id}?collection=${name.key}`,
			description: `Retrieve all versions of a ${name.title.toLowerCase()}`,
			code: `fetch('${apiBaseUrl}/history/versions/${id || '{id}'}?collection=${name.key}')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
		},
	]

	const copyToClipboard = (code: string, id: string) => {
		navigator.clipboard.writeText(code).then(() => {
			setCopied({ ...copied, [id]: true })
			setTimeout(() => {
				setCopied({ ...copied, [id]: false })
			}, 2000)
		})
	}

	return (
		<div className="flex flex-col gap-4">
			<Head title={`${name.title} API`} actions={null} />

			<Card>
				<CardHeader>
					<CardTitle>API Reference</CardTitle>
					<CardDescription>
						Use these API endpoints to interact with {name.title} content
						programmatically.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="get-all">
						<TabsList className="w-full justify-start mb-4 overflow-auto">
							{endpoints.map((endpoint) => (
								<TabsTrigger key={endpoint.id} value={endpoint.id}>
									{endpoint.method} {endpoint.name}
								</TabsTrigger>
							))}
						</TabsList>

						{endpoints.map((endpoint) => (
							<TabsContent key={endpoint.id} value={endpoint.id}>
								<div className="space-y-4">
									<div>
										<p className="text-sm font-medium">Endpoint</p>
										<div className="flex items-center justify-between mt-1 p-2 border rounded-md bg-muted/50">
											<code className="text-sm">
												<span className="text-green-600 font-semibold">
													{endpoint.method}
												</span>{' '}
												{apiBaseUrl}
												{endpoint.path}
											</code>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													copyToClipboard(
														`${apiBaseUrl}${endpoint.path}`,
														`url-${endpoint.id}`,
													)
												}
											>
												{copied[`url-${endpoint.id}`] ? (
													<Check className="h-4 w-4" />
												) : (
													<Copy className="h-4 w-4" />
												)}
											</Button>
										</div>
									</div>

									<div>
										<p className="text-sm font-medium">Description</p>
										<p className="text-sm mt-1">{endpoint.description}</p>
									</div>

									<div>
										<div className="flex items-center justify-between">
											<p className="text-sm font-medium">Example</p>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													copyToClipboard(endpoint.code, endpoint.id)
												}
											>
												{copied[endpoint.id] ? (
													<>
														<Check className="h-4 w-4 mr-2" />
														Copied!
													</>
												) : (
													<>
														<Copy className="h-4 w-4 mr-2" />
														Copy Code
													</>
												)}
											</Button>
										</div>
										<pre className="mt-1 p-3 border rounded-md bg-black text-white overflow-x-auto text-xs">
											{endpoint.code}
										</pre>
									</div>

									{endpoint.id === 'get-locale' && (
										<div className="text-sm mt-4 p-3 border rounded-md bg-muted/50">
											<p className="font-medium mb-1">Available Locales</p>
											<ul className="list-disc list-inside">
												<li>English (en) - Default</li>
												<li>Spanish (es)</li>
												<li>French (fr)</li>
												<li>German (de)</li>
											</ul>
										</div>
									)}
								</div>
							</TabsContent>
						))}
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}

export default ContentManagerViewerAPI
