/**
 * Expose shared dependencies as window globals for runtime plugin loading
 *
 * Plugins are built as UMD bundles that externalize common dependencies.
 * These dependencies are exposed on the window object so plugins can access them.
 */

import * as DndKitCore from '@dnd-kit/core'
import * as DndKitSortable from '@dnd-kit/sortable'
import * as DndKitUtilities from '@dnd-kit/utilities'
import * as MagnetUI from '@magnet-cms/ui/components'
import * as MagnetUILib from '@magnet-cms/ui/lib'
import * as MagnetUtils from '@magnet-cms/utils'
import * as LucideReact from 'lucide-react'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactRouterDOM from 'react-router-dom'
import * as ReactJsxRuntime from 'react/jsx-runtime'

import { FormBuilder } from '~/components/FormBuilder'
import { Loader } from '~/components/Loader'
import {
	PageContent,
	PageHeader,
	PageHeaderStatus,
	PageHeaderTabs,
} from '~/components/PageHeader'
// Admin exports for plugins
import { AdminProvider, useAdmin } from '~/contexts/useAdmin'
import { dialog, useDialog } from '~/core/dialog'
import {
	useAdapter,
	useMagnet,
	useTokenStorage,
} from '~/core/provider/MagnetProvider'
import { useAuth, useLogin, useLogout, useMe, useStatus } from '~/hooks/useAuth'
import {
	useController,
	useControllers,
	useSchema,
	useSchemas,
	useSetting,
	useSettings,
} from '~/hooks/useDiscovery'
import { useContentList } from '~/hooks/useSchema'
import { useSettingData } from '~/hooks/useSetting'

// Extend window type
declare global {
	interface Window {
		React: typeof React
		ReactDOM: typeof ReactDOM
		ReactJsxRuntime: typeof ReactJsxRuntime
		ReactRouterDOM: typeof ReactRouterDOM
		LucideReact: typeof LucideReact
		MagnetUI: typeof MagnetUI
		MagnetUILib: typeof MagnetUILib
		MagnetUtils: typeof MagnetUtils
		MagnetAdmin: Record<string, unknown>
		DndKitCore: typeof DndKitCore
		DndKitSortable: typeof DndKitSortable
		DndKitUtilities: typeof DndKitUtilities
	}
}

/**
 * Expose all shared dependencies on the window object.
 * This must be called before loading any plugin bundles.
 */
export function exposePluginGlobals(): void {
	// Core React
	window.React = React
	window.ReactDOM = ReactDOM
	window.ReactJsxRuntime = ReactJsxRuntime
	window.ReactRouterDOM = ReactRouterDOM

	// UI Libraries
	window.LucideReact = LucideReact
	window.MagnetUI = MagnetUI
	window.MagnetUILib = MagnetUILib
	window.MagnetUtils = MagnetUtils

	// DnD Kit
	window.DndKitCore = DndKitCore
	window.DndKitSortable = DndKitSortable
	window.DndKitUtilities = DndKitUtilities

	// Admin exports (for plugins that need admin utilities)
	window.MagnetAdmin = {
		// Context
		useAdmin,
		AdminProvider,
		// Components
		PageHeader,
		PageContent,
		PageHeaderStatus,
		PageHeaderTabs,
		Loader,
		FormBuilder,
		// Dialog service
		dialog,
		useDialog,
		// Auth hooks
		useAuth,
		useLogin,
		useLogout,
		useMe,
		useStatus,
		// Discovery hooks
		useSchemas,
		useSchema,
		useSettings,
		useSetting,
		useControllers,
		useController,
		// Content hooks
		useContentList,
		useSettingData,
		// Provider hooks
		useAdapter,
		useMagnet,
		useTokenStorage,
	}

	console.log('[Magnet] Plugin globals exposed on window')
}
