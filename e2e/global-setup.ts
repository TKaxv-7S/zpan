/**
 * Playwright setup project — runs once before all device projects.
 * The webServer is already running when this executes.
 * Ensures an admin user and a storage backend exist.
 */
import { test as setup } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers'

const ADMIN_ACCOUNTS = [
  { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  { email: 'admin@zpan.dev', password: 'adminadmin' },
]

const storageConfig = {
  title: 'E2E Storage',
  mode: 'private',
  bucket: 'e2e-test',
  endpoint: 'https://localhost:9000',
  region: 'auto',
  accessKey: 'e2e-access-key',
  secretKey: 'e2e-secret-key',
  capacity: 0,
  status: 'active',
}

type StorageItem = {
  id: string
  mode: string
  capacity: number
  used: number
  status: string
}

function isAvailablePrivateStorage(storage: StorageItem) {
  return (
    storage.mode === 'private' &&
    storage.status === 'active' &&
    (storage.capacity === 0 || storage.used < storage.capacity)
  )
}

setup('seed admin and storage', async ({ request }) => {
  const headers = { Origin: 'http://localhost:5173' }

  // Try each known admin account
  let authed = false
  for (const cred of ADMIN_ACCOUNTS) {
    const resp = await request.post('/api/auth/sign-in/email', {
      headers,
      data: { email: cred.email, password: cred.password },
    })
    if (resp.ok()) {
      authed = true
      break
    }
  }

  // If none worked, register a new admin (fresh DB in CI)
  if (!authed) {
    await request.post('/api/auth/sign-up/email', {
      headers,
      data: { name: 'E2E Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    const resp = await request.post('/api/auth/sign-in/email', {
      headers,
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (!resp.ok()) {
      console.warn('[setup] could not authenticate admin')
      return
    }
  }

  // E2E specs rely on self-service sign-up to create isolated users. Force the
  // local test environment into OPEN mode so existing dev DB settings do not
  // make the suite depend on invite codes.
  await request.put('/api/system/options/auth_signup_mode', {
    headers,
    data: { value: 'open', public: true },
  })

  // Check if storage already exists
  const list = await request.get('/api/admin/storages', { headers })
  if (list.ok()) {
    const data = (await list.json()) as { items?: StorageItem[] }
    const storages = data.items ?? []
    if (storages.some(isAvailablePrivateStorage)) return

    const existing = storages[0]
    if (existing) {
      const resp = await request.put(`/api/admin/storages/${existing.id}`, {
        headers,
        data: storageConfig,
      })
      if (!resp.ok()) throw new Error(`could not update E2E storage: ${resp.status()}`)
      return
    }
  }

  // Seed storage
  const resp = await request.post('/api/admin/storages', {
    headers,
    data: storageConfig,
  })
  if (!resp.ok()) throw new Error(`could not create E2E storage: ${resp.status()}`)
})
