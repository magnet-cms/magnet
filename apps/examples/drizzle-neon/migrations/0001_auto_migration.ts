import type { Migration, MigrationDb } from '@magnet-cms/adapter-db-drizzle'

export const migration: Migration = {
	id: '1774048023985_auto_migration',
	timestamp: 1774048023985,

	async up(db: MigrationDb): Promise<void> {
		await db.execute(`CREATE TABLE "cats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" varchar(36) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"tag_id" text,
	"name" text,
	"birthdate" timestamp,
	"breed" text,
	"description" text,
	"weight" double precision,
	"owner" text,
	"veterinarians" text,
	"photo" text,
	"photos" text,
	"castrated" boolean,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "medicalrecords" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" varchar(36) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"cat" text,
	"veterinarian" text,
	"date" timestamp,
	"type" text,
	"description" text,
	"cost" double precision,
	"medications" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" varchar(36) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"name" text,
	"email" text,
	"phone" text,
	"address" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" varchar(36) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"title" text,
	"slug" text,
	"content" text,
	"excerpt" text,
	"featured_image" text,
	"tags" jsonb,
	"featured" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "veterinarians" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" varchar(36) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"name" text,
	"clinic" text,
	"license_number" text,
	"specialization" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"password" text,
	"name" text,
	"role" text,
	"provider" text,
	"provider_id" text,
	"is_active" boolean DEFAULT true,
	"email_verified" boolean DEFAULT false,
	"last_login" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"action" text,
	"entity_type" text,
	"entity_id" text,
	"entity_name" text,
	"user_id" text,
	"user_name" text,
	"metadata" text,
	"changes" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "apikeys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"key_hash" text,
	"key_prefix" text,
	"user_id" text,
	"permissions" jsonb DEFAULT '["*"]'::jsonb,
	"allowed_schemas" jsonb,
	"allowed_origins" jsonb,
	"allowed_ips" jsonb,
	"expires_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit" double precision DEFAULT 1000,
	"created_at" timestamp NOT NULL,
	"last_used_at" timestamp,
	"usage_count" double precision DEFAULT 0,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "apikeyusages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key_id" text,
	"endpoint" text,
	"method" text,
	"status_code" double precision,
	"response_time" double precision,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp,
	"error" text,
	"schema" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "histories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" text,
	"version_id" text,
	"schema_name" text,
	"locale" text DEFAULT 'en',
	"version_number" double precision DEFAULT 1,
	"status" text DEFAULT 'draft',
	"data" text,
	"created_at" timestamp NOT NULL,
	"created_by" text,
	"notes" text,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "viewconfigs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"schema_name" text,
	"columns" jsonb,
	"page_size" double precision DEFAULT 10,
	"sort_field" text,
	"sort_direction" text,
	"updated_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"filename" text,
	"original_filename" text,
	"mime_type" text,
	"size" double precision,
	"path" text,
	"url" text,
	"folder" text,
	"tags" jsonb,
	"alt" text,
	"width" double precision,
	"height" double precision,
	"custom_fields" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"created_by" text,
	"created_by_name" text
);
`)
		await db.execute(`CREATE TABLE "mediafolders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"path" text,
	"parent_path" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "vaultsecrets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text,
	"description" text,
	"encrypted_data" text,
	"iv" text,
	"auth_tag" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "refreshtokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text,
	"user_id" text,
	"expires_at" timestamp,
	"revoked" boolean DEFAULT false,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"replaced_by_token" text,
	"device_info" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp NOT NULL,
	"last_used_at" timestamp,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"session_id" text,
	"refresh_token_id" text,
	"device_name" text,
	"device_type" text DEFAULT 'unknown',
	"browser" text,
	"os" text,
	"ip_address" text,
	"location" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp NOT NULL,
	"last_activity_at" timestamp,
	"expires_at" timestamp,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "loginattempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"success" boolean,
	"failure_reason" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "passwordresets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"token_hash" text,
	"expires_at" timestamp,
	"used" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "emailverifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text,
	"token_hash" text,
	"expires_at" timestamp,
	"used" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"type" text,
	"title" text,
	"message" text,
	"read" boolean DEFAULT false,
	"href" text,
	"channels" jsonb,
	"channel_results" text,
	"metadata" text,
	"created_at" timestamp NOT NULL,
	"read_at" timestamp,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"display_name" text,
	"description" text,
	"permissions" text,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"permission_id" text,
	"name" text,
	"description" text,
	"group" text,
	"api_id" text,
	"source" text,
	"controller" text,
	"method" text,
	"plugin" text,
	"schema" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text,
	"value" text,
	"group" text,
	"type" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"url" text,
	"description" text,
	"events" jsonb,
	"secret" text,
	"headers" text,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(`CREATE TABLE "webhookdeliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"webhook_id" text,
	"event" text,
	"url" text,
	"payload" text,
	"status_code" double precision,
	"response_body" text,
	"duration" double precision,
	"success" boolean DEFAULT false,
	"error" text,
	"retry_count" double precision DEFAULT 0,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
`)
		await db.execute(
			`CREATE UNIQUE INDEX "cats_document_locale_status_idx" ON "cats" USING btree ("document_id","locale","status");`,
		)
		await db.execute(
			`CREATE INDEX "cats_document_locale_idx" ON "cats" USING btree ("document_id","locale");`,
		)
		await db.execute(
			`CREATE INDEX "cats_status_locale_idx" ON "cats" USING btree ("status","locale");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "cats_tagID_unique_i18n" ON "cats" USING btree ("tag_id") WHERE ("cats"."locale" = 'en' and "cats"."status" = 'draft');`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "medicalrecords_document_locale_status_idx" ON "medicalrecords" USING btree ("document_id","locale","status");`,
		)
		await db.execute(
			`CREATE INDEX "medicalrecords_document_locale_idx" ON "medicalrecords" USING btree ("document_id","locale");`,
		)
		await db.execute(
			`CREATE INDEX "medicalrecords_status_locale_idx" ON "medicalrecords" USING btree ("status","locale");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "owners_document_locale_status_idx" ON "owners" USING btree ("document_id","locale","status");`,
		)
		await db.execute(
			`CREATE INDEX "owners_document_locale_idx" ON "owners" USING btree ("document_id","locale");`,
		)
		await db.execute(
			`CREATE INDEX "owners_status_locale_idx" ON "owners" USING btree ("status","locale");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "owners_email_unique_i18n" ON "owners" USING btree ("email") WHERE ("owners"."locale" = 'en' and "owners"."status" = 'draft');`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "posts_document_locale_status_idx" ON "posts" USING btree ("document_id","locale","status");`,
		)
		await db.execute(
			`CREATE INDEX "posts_document_locale_idx" ON "posts" USING btree ("document_id","locale");`,
		)
		await db.execute(
			`CREATE INDEX "posts_status_locale_idx" ON "posts" USING btree ("status","locale");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "veterinarians_document_locale_status_idx" ON "veterinarians" USING btree ("document_id","locale","status");`,
		)
		await db.execute(
			`CREATE INDEX "veterinarians_document_locale_idx" ON "veterinarians" USING btree ("document_id","locale");`,
		)
		await db.execute(
			`CREATE INDEX "veterinarians_status_locale_idx" ON "veterinarians" USING btree ("status","locale");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "veterinarians_licenseNumber_unique_i18n" ON "veterinarians" USING btree ("license_number") WHERE ("veterinarians"."locale" = 'en' and "veterinarians"."status" = 'draft');`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "apikeys_keyHash_unique" ON "apikeys" USING btree ("key_hash");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "media_filename_unique" ON "media" USING btree ("filename");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "mediafolders_path_unique" ON "mediafolders" USING btree ("path");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "vaultsecrets_key_unique" ON "vaultsecrets" USING btree ("key");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "refreshtokens_token_unique" ON "refreshtokens" USING btree ("token");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "sessions_sessionId_unique" ON "sessions" USING btree ("session_id");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "passwordresets_tokenHash_unique" ON "passwordresets" USING btree ("token_hash");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "emailverifications_tokenHash_unique" ON "emailverifications" USING btree ("token_hash");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "roles_name_unique" ON "roles" USING btree ("name");`,
		)
		await db.execute(
			`CREATE UNIQUE INDEX "permissions_permissionId_unique" ON "permissions" USING btree ("permission_id");`,
		)
	},

	async down(db: MigrationDb): Promise<void> {
		// TODO: implement down migration
	},
}
