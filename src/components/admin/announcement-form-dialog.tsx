import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Announcement, AnnouncementInput } from '@/lib/api'

const AnnouncementMarkdownEditor = lazy(() =>
  import('./announcement-markdown-editor').then((module) => ({
    default: module.AnnouncementMarkdownEditor,
  })),
)

interface AnnouncementFormDialogProps {
  open: boolean
  announcement: Announcement | null
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: AnnouncementInput) => void
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
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    setTitle(announcement?.title ?? '')
    setBody(announcement?.body ?? '')
    setPinned((announcement?.priority ?? 0) > 0)
  }, [announcement])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      title,
      body,
      status: announcement?.status ?? 'draft',
      priority: pinned ? 100 : 0,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {announcement ? t('admin.announcement.editTitle') : t('admin.announcement.createTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">{t('admin.announcement.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="announcement-title">{t('admin.announcement.fieldTitle')}</Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 px-3 py-2">
            <Label htmlFor="announcement-pinned" className="cursor-pointer">
              {t('admin.announcement.fieldPinned')}
            </Label>
            <Switch id="announcement-pinned" checked={pinned} onCheckedChange={setPinned} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-body">{t('admin.announcement.fieldBody')}</Label>
            <Suspense fallback={<div className="h-[360px] rounded-md border bg-muted/20" />}>
              <AnnouncementMarkdownEditor
                id="announcement-body"
                label={t('admin.announcement.fieldBody')}
                value={body}
                onChange={setBody}
              />
            </Suspense>
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
