import { SettingField, Settings } from '@magnet-cms/common'

/**
 * Media & Storage settings schema.
 *
 * These settings control file uploads, storage, and image processing.
 *
 * @example
 * ```typescript
 * // In a service
 * const mediaConfig = await settingsService.get(MediaSettings)
 * if (file.size > mediaConfig.maxFileSize * 1024 * 1024) {
 *   throw new Error('File too large')
 * }
 * ```
 */
@Settings({
  group: 'media',
  label: 'Media & Storage',
  icon: 'image',
  order: 20,
  description: 'Configure file uploads, storage providers, and image processing',
  sections: [
    {
      name: 'storage',
      label: 'Storage',
      icon: 'hard-drive',
      description: 'Configure where files are stored',
      order: 1,
    },
    {
      name: 'limits',
      label: 'Upload Limits',
      icon: 'upload',
      description: 'Configure file upload restrictions',
      order: 2,
    },
    {
      name: 'processing',
      label: 'Image Processing',
      icon: 'wand-2',
      description: 'Configure automatic image optimization',
      order: 3,
    },
    {
      name: 'thumbnails',
      label: 'Thumbnails',
      icon: 'image',
      description: 'Configure thumbnail generation',
      order: 4,
    },
    {
      name: 'security',
      label: 'Security',
      icon: 'shield',
      description: 'Configure file encryption and access control',
      order: 5,
    },
  ],
})
export class MediaSettings {
  // Storage
  @SettingField.Select({
    label: 'Storage Provider',
    description: 'Where files are stored',
    options: [
      { label: 'Local Storage', value: 'local' },
      { label: 'Amazon S3', value: 's3' },
      { label: 'Cloudinary', value: 'cloudinary' },
      { label: 'UploadThing', value: 'uploadthing' },
    ],
    default: 'local',
    section: 'storage',
    order: 1,
  })
  storageProvider = 'local'

  @SettingField.Text({
    label: 'Upload Directory',
    description: 'Base directory for file uploads (local storage)',
    default: 'uploads',
    section: 'storage',
    order: 2,
  })
  uploadDirectory = 'uploads'

  // Upload Limits
  @SettingField.Number({
    label: 'Max File Size (MB)',
    description: 'Maximum file size allowed for uploads in megabytes',
    default: 10,
    section: 'limits',
    order: 1,
  })
  maxFileSize = 10

  @SettingField.Select({
    label: 'Allowed Image Types',
    description: 'Image file types that can be uploaded',
    options: [
      { label: 'JPEG', value: 'jpg' },
      { label: 'PNG', value: 'png' },
      { label: 'GIF', value: 'gif' },
      { label: 'WebP', value: 'webp' },
      { label: 'SVG', value: 'svg' },
      { label: 'AVIF', value: 'avif' },
    ],
    default: 'jpg',
    section: 'limits',
    order: 2,
  })
  allowedImageTypes = 'jpg'

  @SettingField.Number({
    label: 'Max Image Width',
    description: 'Maximum width for uploaded images (0 = no limit)',
    default: 2048,
    section: 'limits',
    order: 3,
  })
  maxImageWidth = 2048

  @SettingField.Number({
    label: 'Max Image Height',
    description: 'Maximum height for uploaded images (0 = no limit)',
    default: 2048,
    section: 'limits',
    order: 4,
  })
  maxImageHeight = 2048

  // Image Processing
  @SettingField.Boolean({
    label: 'Auto-optimize Images',
    description: 'Automatically optimize images on upload',
    default: true,
    section: 'processing',
    order: 1,
  })
  autoOptimize = true

  @SettingField.Number({
    label: 'Image Quality (%)',
    description: 'Quality level for image optimization (1-100)',
    default: 80,
    section: 'processing',
    order: 2,
  })
  imageQuality = 80

  @SettingField.Boolean({
    label: 'Preserve Original',
    description: 'Keep original file when optimizing',
    default: false,
    section: 'processing',
    order: 3,
  })
  preserveOriginal = false

  // Thumbnails
  @SettingField.Boolean({
    label: 'Generate Thumbnails',
    description: 'Automatically generate thumbnails for images',
    default: true,
    section: 'thumbnails',
    order: 1,
  })
  generateThumbnails = true

  @SettingField.Number({
    label: 'Thumbnail Width',
    description: 'Width of generated thumbnails in pixels',
    default: 200,
    section: 'thumbnails',
    order: 2,
  })
  thumbnailWidth = 200

  // Security
  @SettingField.Boolean({
    label: 'Enable File Encryption',
    description:
      'Allow files to be encrypted at rest using AES-256-GCM. Requires a vault adapter to be configured.',
    default: false,
    section: 'security',
    order: 1,
  })
  encryptionEnabled = false

  @SettingField.Boolean({
    label: 'Auto-create Private Folders',
    description:
      'Automatically create a private/{userId} folder when a user uploads an encrypted file.',
    default: true,
    section: 'security',
    order: 2,
  })
  autoCreatePrivateFolders = true
}
