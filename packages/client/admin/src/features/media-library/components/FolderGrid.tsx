import { Folder } from 'lucide-react'

interface Folder {
  id: string
  name: string
  itemCount: number
}

interface FolderGridProps {
  folders: Folder[]
  onFolderClick: (folderId: string) => void
}

export function FolderGrid({ folders, onFolderClick }: FolderGridProps) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Folders</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderClick(folder.id)}
            className="group flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-center"
          >
            <Folder className="w-10 h-10 text-gray-400 group-hover:text-yellow-500 transition-colors mb-2" />
            <span className="text-sm font-medium text-gray-900 truncate w-full">{folder.name}</span>
            <span className="text-xs text-gray-500">{folder.itemCount} items</span>
          </button>
        ))}
      </div>
    </div>
  )
}
