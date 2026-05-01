import type { StorageObject } from '@shared/types'
import { getPreviewType } from '@/lib/file-types'
import type { MusicTrack } from './music-player-provider'

export function formatTrackSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function isMusicPreviewFile(file: MusicTrack): boolean {
  return getPreviewType(file.name, file.type) === 'audio'
}

export function toPreviewFile(item: StorageObject & { downloadUrl?: string }): MusicTrack {
  if (!item.downloadUrl) throw new Error('Audio download URL is missing')
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
    downloadUrl: item.downloadUrl,
  }
}
