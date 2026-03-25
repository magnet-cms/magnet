import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export interface EmailTemplateVersion {
  subject: string
  body: string
  editedBy: string
  editedAt: string
}

export interface EmailTemplate {
  id: string
  slug: string
  locale: string
  subject: string
  body: string
  category: string
  variables: string[]
  versions: EmailTemplateVersion[]
  active: boolean
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateEmailTemplateData {
  slug: string
  subject: string
  body: string
  category?: string
  locale?: string
  variables?: string[]
  active?: boolean
}

export interface UpdateEmailTemplateData {
  subject?: string
  body?: string
  category?: string
  variables?: string[]
  active?: boolean
}

export interface EmailTemplateListFilters {
  category?: string
  locale?: string
  search?: string
  active?: boolean
}

export interface PreviewResult {
  html: string
  subject: string
}

// ============================================================================
// Query Keys
// ============================================================================

export const EMAIL_TEMPLATE_KEYS = {
  all: ['email-templates'] as const,
  list: (filters?: EmailTemplateListFilters) =>
    [...EMAIL_TEMPLATE_KEYS.all, 'list', filters] as const,
  detail: (id: string) => [...EMAIL_TEMPLATE_KEYS.all, 'detail', id] as const,
  versions: (id: string) => [...EMAIL_TEMPLATE_KEYS.all, 'versions', id] as const,
  bySlug: (slug: string) => [...EMAIL_TEMPLATE_KEYS.all, 'by-slug', slug] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/** Fetch all email templates with optional filters. */
export const useEmailTemplateList = (filters?: EmailTemplateListFilters) => {
  const adapter = useAdapter()

  const params = new URLSearchParams()
  if (filters?.category) params.set('category', filters.category)
  if (filters?.locale) params.set('locale', filters.locale)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.active !== undefined) params.set('active', String(filters.active))
  const query = params.toString()

  return useQuery<EmailTemplate[], Error>({
    queryKey: EMAIL_TEMPLATE_KEYS.list(filters),
    queryFn: () => adapter.request<EmailTemplate[]>(`/email-templates${query ? `?${query}` : ''}`),
  })
}

/** Fetch a single email template by ID. */
export const useEmailTemplateDetail = (id: string) => {
  const adapter = useAdapter()

  return useQuery<EmailTemplate, Error>({
    queryKey: EMAIL_TEMPLATE_KEYS.detail(id),
    queryFn: () => adapter.request<EmailTemplate>(`/email-templates/${id}`),
    enabled: !!id,
  })
}

/** Fetch all locale variants of an email template by slug. */
export const useEmailTemplatesBySlug = (slug: string) => {
  const adapter = useAdapter()

  return useQuery<EmailTemplate[], Error>({
    queryKey: EMAIL_TEMPLATE_KEYS.bySlug(slug),
    queryFn: () => adapter.request<EmailTemplate[]>(`/email-templates/by-slug/${slug}`),
    enabled: !!slug,
  })
}

/** Fetch version history for an email template. */
export const useEmailTemplateVersions = (id: string) => {
  const adapter = useAdapter()

  return useQuery<EmailTemplateVersion[], Error>({
    queryKey: EMAIL_TEMPLATE_KEYS.versions(id),
    queryFn: () => adapter.request<EmailTemplateVersion[]>(`/email-templates/${id}/versions`),
    enabled: !!id,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/** Create a new email template. */
export const useEmailTemplateCreate = () => {
  const adapter = useAdapter()
  const queryClient = useQueryClient()

  return useMutation<EmailTemplate, Error, CreateEmailTemplateData>({
    mutationFn: (data) =>
      adapter.request<EmailTemplate>('/email-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: EMAIL_TEMPLATE_KEYS.all,
      })
    },
  })
}

/** Update an existing email template. */
export const useEmailTemplateUpdate = () => {
  const adapter = useAdapter()
  const queryClient = useQueryClient()

  return useMutation<EmailTemplate, Error, { id: string; data: UpdateEmailTemplateData }>({
    mutationFn: ({ id, data }) =>
      adapter.request<EmailTemplate>(`/email-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATE_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: EMAIL_TEMPLATE_KEYS.detail(variables.id),
      })
    },
  })
}

/** Delete an email template. */
export const useEmailTemplateDelete = () => {
  const adapter = useAdapter()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      adapter.request<void>(`/email-templates/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATE_KEYS.all })
    },
  })
}

/** Render a preview of an email template with sample data. */
export const useEmailTemplatePreview = () => {
  const adapter = useAdapter()

  return useMutation<PreviewResult, Error, { id: string; data?: Record<string, unknown> }>({
    mutationFn: ({ id, data }) =>
      adapter.request<PreviewResult>(`/email-templates/${id}/preview`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      }),
  })
}

/** Send a test email for a template to the current admin's address. */
export const useEmailTemplateTestSend = () => {
  const adapter = useAdapter()

  return useMutation<unknown, Error, { id: string; data?: Record<string, unknown> }>({
    mutationFn: ({ id, data }) =>
      adapter.request<unknown>(`/email-templates/${id}/test`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      }),
  })
}
