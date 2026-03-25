'use client'

import { DataTable, type DataTableColumn, type DataTableRenderContext } from '@magnet-cms/ui'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@magnet-cms/ui'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '~/features/shared'
import {
  type EmailTemplate,
  useEmailTemplateDelete,
  useEmailTemplateList,
  useEmailTemplateUpdate,
} from '~/hooks/useEmailTemplates'
import { useAppIntl } from '~/i18n'

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'system', label: 'System' },
]

/**
 * Admin page listing all email templates with search, category filter, and CRUD actions.
 */
export function EmailTemplatesListingPage() {
  const intl = useAppIntl()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const {
    data: templates,
    isLoading,
    error,
  } = useEmailTemplateList({
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
  })

  const updateMutation = useEmailTemplateUpdate()
  const deleteMutation = useEmailTemplateDelete()

  const handleToggleActive = (template: EmailTemplate) => {
    updateMutation.mutate(
      { id: template.id, data: { active: !template.active } },
      {
        onSuccess: () => {
          toast.success(
            template.active
              ? intl.formatMessage({
                  id: 'emailTemplates.toast.deactivated',
                  defaultMessage: 'Template deactivated',
                })
              : intl.formatMessage({
                  id: 'emailTemplates.toast.activated',
                  defaultMessage: 'Template activated',
                }),
          )
        },
        onError: (err) => {
          toast.error(
            intl.formatMessage(
              {
                id: 'emailTemplates.toast.updateFailed',
                defaultMessage: 'Failed to update template: {message}',
              },
              { message: err.message },
            ),
          )
        },
      },
    )
  }

  const handleDelete = (template: EmailTemplate) => {
    deleteMutation.mutate(template.id, {
      onSuccess: () => {
        toast.success(
          intl.formatMessage(
            {
              id: 'emailTemplates.toast.deleted',
              defaultMessage: 'Template "{slug}" deleted',
            },
            { slug: template.slug },
          ),
        )
      },
      onError: (err) => {
        toast.error(
          intl.formatMessage(
            {
              id: 'emailTemplates.toast.deleteFailed',
              defaultMessage: 'Failed to delete template: {message}',
            },
            { message: err.message },
          ),
        )
      },
    })
  }

  const columns: DataTableColumn<EmailTemplate>[] = [
    {
      type: 'code',
      accessorKey: 'slug',
      header: intl.formatMessage({
        id: 'emailTemplates.table.slug',
        defaultMessage: 'Slug',
      }),
    },
    {
      type: 'text',
      accessorKey: 'subject',
      header: intl.formatMessage({
        id: 'emailTemplates.table.subject',
        defaultMessage: 'Subject',
      }),
    },
    {
      type: 'badge',
      accessorKey: 'category',
      header: intl.formatMessage({
        id: 'emailTemplates.table.category',
        defaultMessage: 'Category',
      }),
    },
    {
      type: 'badge',
      accessorKey: 'locale',
      header: intl.formatMessage({
        id: 'emailTemplates.table.locale',
        defaultMessage: 'Locale',
      }),
    },
    {
      type: 'status',
      accessorKey: 'active',
      header: intl.formatMessage({
        id: 'emailTemplates.table.active',
        defaultMessage: 'Active',
      }),
      statusConfig: { positiveValues: [true] },
    },
  ]

  const renderToolbar = () => (
    <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none bg-background border-b border-border">
      <div className="relative w-full sm:w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          type="text"
          className="pl-9 pr-3 py-1.5 border border-border rounded-lg text-sm bg-muted placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:ring-1 focus:ring-ring focus:border-ring transition-all shadow-sm"
          placeholder={intl.formatMessage({
            id: 'emailTemplates.filter.searchPlaceholder',
            defaultMessage: 'Search by slug or subject…',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="appearance-none pl-3 pr-8 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring shadow-sm cursor-pointer min-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted">
          <Button
            variant="ghost"
            size="sm"
            className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearch('')
              setCategory('all')
            }}
          >
            {intl.formatMessage({
              id: 'common.actions.clearFilters',
              defaultMessage: 'Clear Filters',
            })}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderPagination = (table: DataTableRenderContext<EmailTemplate>) => {
    const { pageIndex, pageSize } = table.getState().pagination
    const totalRows = table.getFilteredRowModel().rows.length
    const startRow = totalRows > 0 ? pageIndex * pageSize + 1 : 0
    const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)

    return (
      <div className="flex-none px-6 py-4 border-t border-border bg-background flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {intl.formatMessage(
            {
              id: 'common.pagination.showing',
              defaultMessage: 'Showing {start} to {end} of {total} results',
            },
            { start: startRow, end: endRow, total: totalRows },
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1.5 border border-border rounded-md text-xs font-medium text-muted-foreground bg-muted"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            {intl.formatMessage({
              id: 'common.actions.previous',
              defaultMessage: 'Previous',
            })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1.5 border border-border rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            {intl.formatMessage({
              id: 'common.actions.next',
              defaultMessage: 'Next',
            })}
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center px-6">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {intl.formatMessage({
                id: 'emailTemplates.title',
                defaultMessage: 'Email Templates',
              })}
            </h1>
          </div>
        </PageHeader>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center px-6">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {intl.formatMessage({
                id: 'emailTemplates.title',
                defaultMessage: 'Email Templates',
              })}
            </h1>
          </div>
        </PageHeader>
        <div className="flex-1 p-6">
          <div className="text-red-500">
            {intl.formatMessage(
              {
                id: 'emailTemplates.loadFailed',
                defaultMessage: 'Failed to load templates: {message}',
              },
              { message: error.message },
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
      {/* Header */}
      <PageHeader>
        <div className="h-16 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {intl.formatMessage({
                id: 'emailTemplates.title',
                defaultMessage: 'Email Templates',
              })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({
                id: 'emailTemplates.subtitle',
                defaultMessage: 'Manage your branded email templates.',
              })}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/email-templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {intl.formatMessage({
              id: 'emailTemplates.createTemplate',
              defaultMessage: 'Create Template',
            })}
          </Button>
        </div>
      </PageHeader>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/50">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <DataTable
              data={templates ?? []}
              columns={columns}
              options={{
                rowActions: {
                  items: [
                    {
                      label: intl.formatMessage({
                        id: 'common.actions.edit',
                        defaultMessage: 'Edit',
                      }),
                      onSelect: (row) => navigate(`/email-templates/${row.id}`),
                    },
                    {
                      label: intl.formatMessage({
                        id: 'emailTemplates.actions.toggleActive',
                        defaultMessage: 'Toggle Active',
                      }),
                      onSelect: handleToggleActive,
                    },
                    {
                      label: intl.formatMessage({
                        id: 'common.actions.delete',
                        defaultMessage: 'Delete',
                      }),
                      onSelect: handleDelete,
                      destructive: true,
                    },
                  ],
                },
              }}
              getRowId={(row) => row.id}
              renderToolbar={renderToolbar}
              renderPagination={renderPagination}
              enablePagination={true}
              pageSizeOptions={[10, 20, 50]}
              showCount={false}
              className="h-full flex flex-col"
              variant="content-manager"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
