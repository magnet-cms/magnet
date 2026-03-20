import { Folder as FolderIcon } from 'lucide-react'
import { useAppIntl } from '~/i18n'

interface FolderItem {
	id: string
	name: string
	itemCount: number
}

interface FolderGridProps {
	folders: FolderItem[]
	onFolderClick: (folderId: string) => void
}

export function FolderGrid({ folders, onFolderClick }: FolderGridProps) {
	const intl = useAppIntl()
	return (
		<div className="mb-6">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{intl.formatMessage({ id: 'media.folders', defaultMessage: 'Folders' })}
			</h3>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
				{folders.map((folder) => (
					<button
						type="button"
						key={folder.id}
						onClick={() => onFolderClick(folder.id)}
						className="group flex cursor-pointer flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-muted-foreground/30 hover:shadow-sm"
					>
						<FolderIcon className="mb-2 size-10 text-muted-foreground transition-colors group-hover:text-yellow-500" />
						<span className="w-full truncate text-sm font-medium text-foreground">
							{folder.name}
						</span>
						<span className="text-xs text-muted-foreground">
							{intl.formatMessage(
								{ id: 'media.itemCount', defaultMessage: '{count} items' },
								{ count: folder.itemCount },
							)}
						</span>
					</button>
				))}
			</div>
		</div>
	)
}
