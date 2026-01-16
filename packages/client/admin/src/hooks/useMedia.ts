import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	MediaItem,
	MediaQueryOptions,
	MediaUploadOptions,
	PaginatedMedia,
	TransformOptions,
} from '~/core/adapters/types'
import { useAdapter } from '~/core/provider/MagnetProvider'

/**
 * Hook to fetch paginated media list with filtering options
 */
export const useMediaList = (options?: MediaQueryOptions) => {
	const adapter = useAdapter()

	return useQuery<PaginatedMedia, Error>({
		queryKey: ['media', 'list', options],
		queryFn: () => adapter.media.list(options),
	})
}

/**
 * Hook to fetch a single media item by ID
 */
export const useMedia = (id: string) => {
	const adapter = useAdapter()

	return useQuery<MediaItem, Error>({
		queryKey: ['media', id],
		queryFn: () => adapter.media.get(id),
		enabled: !!id,
	})
}

/**
 * Hook to upload a single file
 */
export const useMediaUpload = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		MediaItem,
		Error,
		{ file: File; options?: MediaUploadOptions }
	>({
		mutationFn: ({ file, options }) => adapter.media.upload(file, options),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['media'] })
		},
	})
}

/**
 * Hook to upload multiple files
 */
export const useMediaUploadMultiple = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		MediaItem[],
		Error,
		{ files: File[]; options?: MediaUploadOptions }
	>({
		mutationFn: ({ files, options }) =>
			adapter.media.uploadMultiple(files, options),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['media'] })
		},
	})
}

/**
 * Hook to update media metadata
 */
export const useMediaUpdate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		MediaItem,
		Error,
		{
			id: string
			data: { alt?: string; tags?: string[]; folder?: string }
		}
	>({
		mutationFn: ({ id, data }) => adapter.media.update(id, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['media', id] })
			queryClient.invalidateQueries({ queryKey: ['media', 'list'] })
		},
	})
}

/**
 * Hook to delete a single media item
 */
export const useMediaDelete = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ success: boolean }, Error, string>({
		mutationFn: (id) => adapter.media.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['media'] })
		},
	})
}

/**
 * Hook to delete multiple media items
 */
export const useMediaDeleteMany = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ deleted: number; failed: string[] }, Error, string[]>({
		mutationFn: (ids) => adapter.media.deleteMany(ids),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['media'] })
		},
	})
}

/**
 * Hook to fetch all available folders
 */
export const useMediaFolders = () => {
	const adapter = useAdapter()

	return useQuery<string[], Error>({
		queryKey: ['media', 'folders'],
		queryFn: () => adapter.media.getFolders(),
	})
}

/**
 * Hook to fetch all available tags
 */
export const useMediaTags = () => {
	const adapter = useAdapter()

	return useQuery<string[], Error>({
		queryKey: ['media', 'tags'],
		queryFn: () => adapter.media.getTags(),
	})
}

/**
 * Hook to fetch storage statistics
 */
export const useMediaStats = () => {
	const adapter = useAdapter()

	return useQuery({
		queryKey: ['media', 'stats'],
		queryFn: () => adapter.media.getStats(),
	})
}

/**
 * Hook to get the media URL builder function
 */
export const useMediaUrl = () => {
	const adapter = useAdapter()

	return {
		/**
		 * Get the URL for a media file with optional transforms
		 */
		getUrl: (id: string, transform?: TransformOptions) =>
			adapter.media.getUrl(id, transform),
		/**
		 * Get a thumbnail URL (200x200 cover)
		 */
		getThumbnailUrl: (id: string) =>
			adapter.media.getUrl(id, { width: 200, height: 200, fit: 'cover' }),
		/**
		 * Get a preview URL (400px width)
		 */
		getPreviewUrl: (id: string) => adapter.media.getUrl(id, { width: 400 }),
	}
}
