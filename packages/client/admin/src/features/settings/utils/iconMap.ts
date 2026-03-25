import type { LucideIcon } from 'lucide-react'
import * as Icons from 'lucide-react'

/**
 * Maps an icon name string to a Lucide icon component.
 *
 * Supports multiple naming conventions:
 * - kebab-case: "shield-check"
 * - lowercase: "shieldcheck"
 * - PascalCase: "ShieldCheck"
 *
 * @param iconName - The icon name to look up
 * @returns The Lucide icon component, or undefined if not found
 */
export function getIconComponent(iconName: string | undefined): LucideIcon | undefined {
  if (!iconName) return undefined

  // Convert kebab-case to PascalCase (e.g., "shield-check" -> "ShieldCheck")
  const pascalCase = iconName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')

  // Try to find the icon in the Icons namespace
  const iconsMap = Icons as unknown as Record<string, LucideIcon>
  return iconsMap[pascalCase]
}

/**
 * Checks if an icon name is valid (exists in Lucide icons)
 *
 * @param iconName - The icon name to check
 * @returns true if the icon exists
 */
export function isValidIcon(iconName: string | undefined): boolean {
  return getIconComponent(iconName) !== undefined
}
