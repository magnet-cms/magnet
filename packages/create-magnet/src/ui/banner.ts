import ansis from 'ansis'

const LOGO = `
    __  ___                       __
   /  |/  /___ _____ _____  ___  / /_
  / /|_/ / __ \`/ __ \`/ __ \\/ _ \\/ __/
 / /  / / /_/ / /_/ / / / /  __/ /_
/_/  /_/\\__,_/\\__, /_/ /_/\\___/\\__/
             /____/   CMS Framework
`

export function showBanner(): void {
  console.log(ansis.cyan(LOGO))
  console.log(ansis.dim("Welcome to Magnet CMS! Let's create your project.\n"))
}
