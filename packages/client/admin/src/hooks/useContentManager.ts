import { SchemaMetadata } from '@magnet-cms/common'
import { TextNames, names } from '@magnet-cms/utils'
import { useOutletContext, useParams } from 'react-router-dom'
import { useSchema } from '~/hooks/useDiscovery'

export type ContentManagerItemContext = {
	name: TextNames
	schemaMetadata: SchemaMetadata
}

export const useContentManager = () => {
	const { schema } = useParams()
	const outletContext = useOutletContext<ContentManagerItemContext>()

	if (outletContext?.name && outletContext.schemaMetadata) {
		return {
			name: outletContext.name,
			schemaMetadata: outletContext.schemaMetadata,
		}
	}

	const { data: schemaMetadata } = useSchema(schema as string)

	if (!schemaMetadata) {
		return null
	}

	const name = names(String(schema))

	return {
		name,
		schemaMetadata,
	}
}
