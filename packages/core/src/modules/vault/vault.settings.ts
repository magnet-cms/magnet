import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Vault settings schema.
 *
 * These settings control vault behavior from the admin panel.
 * The actual vault adapter and master key are configured via code/env vars
 * — they are never stored in the database.
 */
@Settings({
  group: 'vault',
  label: 'Vault',
  icon: 'key-round',
  order: 15,
  description: 'Configure encrypted secrets management for the CMS',
  sections: [
    {
      name: 'cache',
      label: 'Cache',
      icon: 'database',
      description: 'Secret caching configuration',
      order: 1,
    },
  ],
})
export class VaultSettings {
  @SettingField.Number({
    label: 'Cache TTL (seconds)',
    description:
      'How long resolved secrets are cached in memory before re-fetching from the vault backend. Set to 0 to disable caching.',
    default: 300,
    section: 'cache',
    order: 1,
  })
  cacheTtl = 300

  @SettingField.Boolean({
    label: 'Enable Cache',
    description: 'Cache secrets in memory to reduce vault backend calls',
    default: true,
    section: 'cache',
    order: 2,
  })
  cacheEnabled = true
}
