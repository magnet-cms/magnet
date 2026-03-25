import { MongooseDatabaseAdapter } from '@magnet-cms/adapter-db-mongoose'
import { GraphQLAdapter } from '@magnet-cms/adapter-graphql'
import { HashiCorpVaultAdapter } from '@magnet-cms/adapter-vault-hashicorp'
import { MagnetModule } from '@magnet-cms/core'
import { PlaygroundPlugin } from '@magnet-cms/plugin-playground'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { CatsModule } from './modules/cats/cats.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { OwnersModule } from './modules/owners/owners.module'
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module'

/**
 * Example application using Magnet CMS with MongoDB (Mongoose).
 *
 * This demonstrates:
 * - Mongoose database adapter
 * - JWT authentication (built-in)
 * - Local file storage (default)
 * - HashiCorp Vault for secrets management
 * - Built-in email (console-only; add NodemailerEmailAdapter for SMTP)
 * - Playground plugin
 * - Admin UI serving
 *
 * To run this example:
 * 1. Copy .env.example to .env
 * 2. Run: bun run docker:up
 * 3. Run: bun run dev
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MagnetModule.forRoot(
      [
        MongooseDatabaseAdapter.forRoot(),
        HashiCorpVaultAdapter.forRoot(),
        PlaygroundPlugin.forRoot(),
        GraphQLAdapter.forRoot(),
      ],
      { admin: true },
    ),
    CatsModule,
    OwnersModule,
    VeterinariansModule,
    MedicalRecordsModule,
  ],
})
export class AppModule {}
