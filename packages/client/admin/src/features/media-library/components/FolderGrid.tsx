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
			<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
				{intl.formatMessage({ id: 'media.folders', defaultMessage: 'Folders' })}
			</h3>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
				{folders.map((folder) => (
					<button
						type="button"
						key={folder.id}
						onClick={() => onFolderClick(folder.id)}
						className="group flex flex-col items-center p-4 bg-card border border-border rounded-xl hover:border-muted-foreground/30 hover:shadow-sm transition-all text-center cursor-pointer"
					>
						<FolderIcon className="w-10 h-10 text-gray-400 group-hover:text-yellow-500 transition-colors mb-2" />
						<span className="text-sm font-medium text-gray-900 truncate w-full">
							{folder.name}
						</span>
						<span className="text-xs text-gray-500">
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
