import { request } from '@playwright/test'

interface ServerConfig {
  url: string
  healthEndpoint?: string
  timeout?: number
  interval?: number
}

export async function waitForServer(config: ServerConfig): Promise<void> {
  const { url, healthEndpoint = '/health', timeout = 60_000, interval = 1_000 } = config

  const startTime = Date.now()
  const healthUrl = `${url}${healthEndpoint}`

  while (Date.now() - startTime < timeout) {
    try {
      const context = await request.newContext()
      const response = await context.get(healthUrl)
      await context.dispose()

      if (response.ok()) {
        console.log(`Server at ${url} is ready`)
        return
      }
    } catch {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`)
}

export async function waitForServers(): Promise<void> {
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000'
  const uiUrl = process.env.UI_BASE_URL || 'http://localhost:3001'

  // Use longer timeout if TEMPLATE_NAME is set (automated testing)
  const isAutomated = !!process.env.TEMPLATE_NAME
  const apiTimeout = isAutomated ? 90_000 : 10_000
  const uiTimeout = isAutomated ? 45_000 : 10_000

  await Promise.all([
    waitForServer({
      url: apiUrl,
      healthEndpoint: '/health',
      timeout: apiTimeout,
    }),
    waitForServer({ url: uiUrl, healthEndpoint: '/', timeout: uiTimeout }),
  ])
}
