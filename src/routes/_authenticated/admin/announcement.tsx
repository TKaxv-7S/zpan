import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Archive, Megaphone, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AnnouncementFormDialog } from '@/components/admin/announcement-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Announcement, AnnouncementInput } from '@/lib/api'
import { createAnnouncement, deleteAnnouncement, listAdminAnnouncements, updateAnnouncement } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/admin/announcement')({
  component: AnnouncementPage,
})

type StatusFilter = 'all' | Announcement['status']

function announcementInput(announcement: Announcement, status = announcement.status): AnnouncementInput {
  return {
    title: announcement.title,
    body: announcement.body,
    status,
    priority: announcement.priority,
    publishedAt:
      status === 'published' ? (announcement.publishedAt ?? new Date().toISOString()) : announcement.publishedAt,
    expiresAt: announcement.expiresAt,
  }
}

function AnnouncementPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)

  const announcementsQuery = useQuery({
    queryKey: ['admin', 'announcements', status],
    queryFn: () => listAdminAnnouncements(1, 50, status === 'all' ? undefined : status),
  })

  function invalidateAnnouncements() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    queryClient.invalidateQueries({ queryKey: ['announcements'] })
  }

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      invalidateAnnouncements()
      setFormOpen(false)
      toast.success(t('admin.announcement.created'))
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AnnouncementInput }) => updateAnnouncement(id, input),
    onSuccess: () => {
      invalidateAnnouncements()
      setFormOpen(false)
      setEditing(null)
      toast.success(t('admin.announcement.updated'))
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      invalidateAnnouncements()
      toast.success(t('admin.announcement.deleted'))
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSave(input: AnnouncementInput) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, input })
      return
    }
    createMutation.mutate(input)
  }

  function handleStatusChange(announcement: Announcement, nextStatus: Announcement['status']) {
    updateMutation.mutate({ id: announcement.id, input: announcementInput(announcement, nextStatus) })
  }

  function handleDelete(announcement: Announcement) {
    if (window.confirm(t('admin.announcement.deleteConfirm', { title: announcement.title }))) {
      deleteMutation.mutate(announcement.id)
    }
  }

  const announcements = announcementsQuery.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t('admin.announcement.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('admin.announcement.description')}</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.announcement.create')}
        </Button>
      </div>

      <div className="w-48">
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.announcement.filterAll')}</SelectItem>
            <SelectItem value="draft">{t('announcement.status.draft')}</SelectItem>
            <SelectItem value="published">{t('announcement.status.published')}</SelectItem>
            <SelectItem value="archived">{t('announcement.status.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t('admin.announcement.fieldTitle')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('admin.announcement.fieldStatus')}</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
                {t('admin.announcement.fieldPublishedAt')}
              </th>
              <th className="px-4 py-3 text-right font-medium">{t('admin.storages.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((announcement) => (
              <AnnouncementRow
                key={announcement.id}
                announcement={announcement}
                onEdit={() => {
                  setEditing(announcement)
                  setFormOpen(true)
                }}
                onPublish={() => handleStatusChange(announcement, 'published')}
                onArchive={() => handleStatusChange(announcement, 'archived')}
                onDelete={() => handleDelete(announcement)}
              />
            ))}
            {announcements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <Megaphone className="h-10 w-10" />
                    <p>{t('admin.announcement.empty')}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnnouncementFormDialog
        open={formOpen}
        announcement={editing}
        saving={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        onSubmit={handleSave}
      />
    </div>
  )
}

function AnnouncementRow({
  announcement,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: {
  announcement: Announcement
  onEdit: () => void
  onPublish: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const { t, i18n } = useTranslation()
  const canPublish = announcement.status !== 'published'
  const canArchive = announcement.status === 'published'

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="max-w-80 px-4 py-3">
        <p className="truncate font-medium">{announcement.title}</p>
        {announcement.body && <p className="mt-1 line-clamp-1 text-muted-foreground">{announcement.body}</p>}
      </td>
      <td className="px-4 py-3">
        <Badge variant={announcement.status === 'published' ? 'default' : 'secondary'}>
          {t(`announcement.status.${announcement.status}`)}
        </Badge>
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
        {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleString(i18n.language) : '-'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {canPublish && (
            <Button variant="ghost" size="icon-xs" onClick={onPublish} title={t('admin.announcement.publish')}>
              <Send />
            </Button>
          )}
          {canArchive && (
            <Button variant="ghost" size="icon-xs" onClick={onArchive} title={t('admin.announcement.archive')}>
              <Archive />
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" onClick={onEdit} title={t('common.edit')}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onDelete} title={t('common.delete')}>
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
