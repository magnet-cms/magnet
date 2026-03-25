// Minimal type declarations for optional peer dependencies.
// These are loaded dynamically at runtime only when the user's project has them installed.

declare module 'mysql2/promise' {
  interface Connection {
    execute(sql: string, params?: unknown[]): Promise<unknown>
  }
  function createConnection(url: string): Promise<Connection>
  export { createConnection }
  export type { Connection }
}

declare module 'better-sqlite3' {
  interface Database {
    exec(sql: string): void
  }
  interface DatabaseConstructor {
    new (filename: string, options?: { memory?: boolean; readonly?: boolean }): Database
    (filename: string, options?: { memory?: boolean; readonly?: boolean }): Database
  }
  const Database: DatabaseConstructor
  export default Database
  export type { Database }
}
