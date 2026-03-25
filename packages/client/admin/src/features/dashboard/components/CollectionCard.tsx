import {
  CollectionCard as BaseCollectionCard,
  type CollectionCardProps as BaseProps,
} from '@magnet-cms/ui'
import { Link } from 'react-router-dom'

// Re-export with react-router Link pre-configured
type CollectionCardProps = Omit<BaseProps, 'linkComponent'>

export function CollectionCard(props: CollectionCardProps) {
  return <BaseCollectionCard {...props} linkComponent={Link} />
}

// Also export the type for consumers
export type { CollectionCardProps }
