import type { AnnouncementInput, AnnouncementStatus } from '@shared/schemas'
import { and, count, desc, eq, gt, isNull, lte, ne, or } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { announcements } from '../db/schema'
import type { Database } from '../platform/interface'

export type Announcement = typeof announcements.$inferSelect

export type ListAnnouncementsResult = {
  items: Announcement[]
  total: number
  page: number
  pageSize: number
}

function pageParams(page: number, pageSize: number) {
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (value === undefined || value === null) return null
  return new Date(value)
}

function publishedAtFor(input: AnnouncementInput, existing?: Announcement): Date | null {
  const publishedAt = parseDate(input.publishedAt)
  if (input.status === 'archived') return publishedAt ?? existing?.publishedAt ?? null
  if (input.status !== 'published') return null
  if (publishedAt) return publishedAt
  return existing?.publishedAt ?? new Date()
}

export async function createAnnouncement(
  db: Database,
  input: AnnouncementInput,
  createdBy: string,
): Promise<Announcement> {
  const now = new Date()
  const row: Announcement = {
    id: nanoid(),
    title: input.title,
    body: input.body,
    status: input.status,
    priority: input.priority,
    publishedAt: publishedAtFor(input),
    expiresAt: parseDate(input.expiresAt),
    createdBy,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(announcements).values(row)
  return row
}

export async function listAdminAnnouncements(
  db: Database,
  opts: { status?: AnnouncementStatus; page: number; pageSize: number },
): Promise<ListAnnouncementsResult> {
  const { limit, offset } = pageParams(opts.page, opts.pageSize)
  const where = opts.status ? eq(announcements.status, opts.status) : undefined

  const [items, totalRows] = await Promise.all([
    db.select().from(announcements).where(where).orderBy(desc(announcements.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(announcements).where(where),
  ])

  return { items, total: totalRows[0]?.count ?? 0, page: opts.page, pageSize: opts.pageSize }
}

export async function getAnnouncement(db: Database, id: string): Promise<Announcement | null> {
  const rows = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1)
  return rows[0] ?? null
}

export async function updateAnnouncement(
  db: Database,
  id: string,
  input: AnnouncementInput,
): Promise<Announcement | null> {
  const existing = await getAnnouncement(db, id)
  if (!existing) return null

  await db
    .update(announcements)
    .set({
      title: input.title,
      body: input.body,
      status: input.status,
      priority: input.priority,
      publishedAt: publishedAtFor(input, existing),
      expiresAt: parseDate(input.expiresAt),
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id))

  return getAnnouncement(db, id)
}

export async function deleteAnnouncement(db: Database, id: string): Promise<boolean> {
  const existing = await getAnnouncement(db, id)
  if (!existing) return false

  await db.delete(announcements).where(eq(announcements.id, id))
  return true
}

export async function listUserAnnouncements(
  db: Database,
  opts: { activeOnly: boolean; page: number; pageSize: number },
): Promise<ListAnnouncementsResult> {
  const now = new Date()
  const { limit, offset } = pageParams(opts.page, opts.pageSize)
  const baseCondition = opts.activeOnly
    ? and(
        eq(announcements.status, 'published'),
        lte(announcements.publishedAt, now),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
      )
    : and(ne(announcements.status, 'draft'), lte(announcements.publishedAt, now))

  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(announcements)
      .where(baseCondition)
      .orderBy(desc(announcements.priority), desc(announcements.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(announcements).where(baseCondition),
  ])

  return { items, total: totalRows[0]?.count ?? 0, page: opts.page, pageSize: opts.pageSize }
}
