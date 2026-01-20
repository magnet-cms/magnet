import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { Callout } from 'fumadocs-ui/components/callout'
import { Card, Cards } from 'fumadocs-ui/components/card'
import { File, Files, Folder } from 'fumadocs-ui/components/files'
import { ImageZoom } from 'fumadocs-ui/components/image-zoom'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		// Interactive components
		Accordion,
		Accordions,
		Callout,
		Card,
		Cards,
		File,
		Folder,
		Files,
		Step,
		Steps,
		Tab,
		Tabs,
		ImageZoom,
		TypeTable,
		// Custom image component with zoom
		img: (props) => <ImageZoom {...props} />,
		...components,
	}
}
