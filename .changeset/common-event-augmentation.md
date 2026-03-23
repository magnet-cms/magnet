---
"@magnet-cms/common": patch
---

Fix EventPayload and OnEvent to use `keyof EventPayloadMap` constraints so module augmentation works correctly with published types. Add `encrypt` and `ownerId` fields to `UploadOptions` and `isEncrypted`/`ownerId` to `UploadResult` for per-user AES-256-GCM file encryption.
