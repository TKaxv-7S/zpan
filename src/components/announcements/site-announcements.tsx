import type { Announcement } from '@shared/types'
import { useQuery } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listActiveAnnouncements } from '@/lib/api'
import { AnnouncementMarkdown } from './markdown-content'

const activeAnnouncementsQueryKey = ['announcements', 'active'] as const
const openAnnouncementsEvent = 'zpan:open-announcements'
const announcementAutoOpenPrefix = 'zpan:announcements:auto-open'

export function openAnnouncementsDialog() {
  window.dispatchEvent(new Event(openAnnouncementsEvent))
}

export function SiteAnnouncements() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [autoOpenKey, setAutoOpenKey] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: activeAnnouncementsQueryKey,
    queryFn: listActiveAnnouncements,
  })

  const announcements = data?.items ?? []
  const latest = announcements[0]
  const latestAutoOpenKey = latest ? `${announcementAutoOpenPrefix}:${latest.id}:${latest.updatedAt}` : null

  useEffect(() => {
    function handleOpen() {
      if (latest) {
        setExpandedId(latest.id)
        setOpen(true)
      }
    }

    window.addEventListener(openAnnouncementsEvent, handleOpen)
    return () => window.removeEventListener(openAnnouncementsEvent, handleOpen)
  }, [latest])

  useEffect(() => {
    if (!latest || !latestAutoOpenKey || expandedId) return
    if (localStorage.getItem(latestAutoOpenKey)) return

    setExpandedId(latest.id)
    setAutoOpenKey(latestAutoOpenKey)
    setOpen(true)
  }, [latest, latestAutoOpenKey, expandedId])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen && autoOpenKey) {
      localStorage.setItem(autoOpenKey, 'closed')
      setAutoOpenKey(null)
    }
  }

  if (announcements.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(720px,calc(100vh-2rem))] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {t('announcement.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('announcement.description')}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
          {announcements.map((announcement) => (
            <AnnouncementPanel
              key={announcement.id}
              announcement={announcement}
              expanded={expandedId === announcement.id}
              onToggle={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AnnouncementPanel({
  announcement,
  expanded,
  onToggle,
}: {
  announcement: Announcement
  expanded: boolean
  onToggle: () => void
}) {
  const { i18n } = useTranslation()
  const date = announcement.publishedAt ?? announcement.createdAt

  return (
    <section className="rounded-md border bg-card">
      <Button variant="ghost" className="h-auto w-full justify-start rounded-md px-4 py-3 text-left" onClick={onToggle}>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-sm">{announcement.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {new Date(date).toLocaleString(i18n.language)}
          </span>
        </span>
      </Button>
      {expanded && announcement.body && (
        <div className="border-t px-4 py-3">
          <AnnouncementMarkdown content={announcement.body} />
        </div>
      )}
    </section>
  )
}
