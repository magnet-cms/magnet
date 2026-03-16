import { Plugin } from '@magnet-cms/core'
import { PolarModule } from './polar.module'

// TODO: Add frontend manifest when admin pages are implemented

@Plugin({
	name: 'polar',
	description: 'Polar.sh payments plugin for Magnet CMS',
	version: '0.1.0',
	module: PolarModule,
})
export class PolarPlugin {}
