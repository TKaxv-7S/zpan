import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnnouncementMarkdown } from '@/components/announcements/markdown-content'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Announcement, AnnouncementInput } from '@/lib/api'

interface AnnouncementFormDialogProps {
  open: boolean
  announcement: Announcement | null
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: AnnouncementInput) => void
}

function dateTimeInputValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function isoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null
}

export function AnnouncementFormDialog({
  open,
  announcement,
  saving,
  onOpenChange,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<AnnouncementInput['status']>('draft')
  const [priority, setPriority] = useState(0)
  const [publishedAt, setPublishedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    setTitle(announcement?.title ?? '')
    setBody(announcement?.body ?? '')
    setStatus(announcement?.status ?? 'draft')
    setPriority(announcement?.priority ?? 0)
    setPublishedAt(dateTimeInputValue(announcement?.publishedAt ?? null))
    setExpiresAt(dateTimeInputValue(announcement?.expiresAt ?? null))
  }, [announcement])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      title,
      body,
      status,
      priority,
      publishedAt: isoDateTime(publishedAt),
      expiresAt: isoDateTime(expiresAt),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {announcement ? t('admin.announcement.editTitle') : t('admin.announcement.createTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="announcement-title">{t('admin.announcement.fieldTitle')}</Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-body">{t('admin.announcement.fieldBody')}</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <Textarea
                id="announcement-body"
                rows={10}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <div className="min-h-[240px] rounded-md border bg-muted/20 p-3">
                <p className="mb-2 font-medium text-muted-foreground text-xs">
                  {t('admin.announcement.markdownPreview')}
                </p>
                {body ? (
                  <AnnouncementMarkdown content={body} />
                ) : (
                  <p className="text-muted-foreground text-sm">{t('admin.announcement.emptyPreview')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('admin.announcement.fieldStatus')}</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AnnouncementInput['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('announcement.status.draft')}</SelectItem>
                  <SelectItem value="published">{t('announcement.status.published')}</SelectItem>
                  <SelectItem value="archived">{t('announcement.status.archived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-priority">{t('admin.announcement.fieldPriority')}</Label>
              <Input
                id="announcement-priority"
                type="number"
                min={0}
                max={100}
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="announcement-published-at">{t('admin.announcement.fieldPublishedAt')}</Label>
              <Input
                id="announcement-published-at"
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-expires-at">{t('admin.announcement.fieldExpiresAt')}</Label>
              <Input
                id="announcement-expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
