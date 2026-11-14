// 家族との共有用API。
//   POST   /api/share            共有を開始する（id と書き込み用の鍵を返す）
//   GET    /api/share?id=...     記録を読む（リンクを知っている人なら誰でも）
//   PUT    /api/share?id=...     記録を更新する（書き込み用の鍵が必要）
//   DELETE /api/share?id=...     共有をやめてサーバー上の記録を消す（鍵が必要）
//
// このファイルは Vercel Functions としてそのままデプロイされるので、
// src/ からは import せず、検証も含めて自己完結させている。

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { del, get, put } from '@vercel/blob'

export interface Snapshot {
  settings: { pricePerPack: number; monthlyGoalPacks: number | null }
  purchases: { id: string; date: string; price: number; createdAt: string }[]
}

interface StoredShare {
  writeKeyHash: string
  updatedAt: string
  snapshot: Snapshot
}

/** 保存先。テストではメモリ上の実装に差し替える。 */
export interface ShareStore {
  read(id: string): Promise<StoredShare | null>
  write(id: string, value: StoredShare): Promise<void>
  remove(id: string): Promise<void>
}

const MAX_BODY_BYTES = 512 * 1024
const MAX_PURCHASES = 20000
const ID_RE = /^[A-Za-z0-9_-]{22}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

const error = (status: number, message: string) => json(status, { error: message })

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isPositiveInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 1_000_000

/** 受け取った記録を検証し、知っている項目だけを取り出す。不正なら null。 */
export function parseSnapshot(data: unknown): Snapshot | null {
  if (!isRecord(data) || !isRecord(data.settings) || !Array.isArray(data.purchases)) return null
  if (data.purchases.length > MAX_PURCHASES) return null
  const s = data.settings
  if (!isPositiveInt(s.pricePerPack)) return null
  if (s.monthlyGoalPacks !== null && !isPositiveInt(s.monthlyGoalPacks)) return null

  const purchases: Snapshot['purchases'] = []
  for (const p of data.purchases) {
    if (
      !isRecord(p) ||
      typeof p.id !== 'string' ||
      p.id.length > 64 ||
      typeof p.date !== 'string' ||
      !DATE_RE.test(p.date) ||
      !isPositiveInt(p.price) ||
      typeof p.createdAt !== 'string' ||
      p.createdAt.length > 40
    ) {
      return null
    }
    purchases.push({ id: p.id, date: p.date, price: p.price, createdAt: p.createdAt })
  }
  return {
    settings: { pricePerPack: s.pricePerPack, monthlyGoalPacks: s.monthlyGoalPacks },
    purchases,
  }
}

async function readSnapshot(request: Request): Promise<Snapshot | null> {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return null
  try {
    const body: unknown = JSON.parse(text)
    return isRecord(body) ? parseSnapshot(body.snapshot) : null
  } catch {
    return null
  }
}

function keyMatches(request: Request, stored: StoredShare): boolean {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return false
  const given = Buffer.from(sha256(header.slice(7)))
  const expected = Buffer.from(stored.writeKeyHash)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export function createHandler(store: ShareStore) {
  return async function handle(request: Request): Promise<Response> {
    const id = new URL(request.url).searchParams.get('id')

    if (request.method === 'POST') {
      const snapshot = await readSnapshot(request)
      if (!snapshot) return error(400, 'invalid snapshot')
      const newId = randomBytes(16).toString('base64url')
      const writeKey = randomBytes(32).toString('base64url')
      await store.write(newId, {
        writeKeyHash: sha256(writeKey),
        updatedAt: new Date().toISOString(),
        snapshot,
      })
      return json(201, { id: newId, writeKey })
    }

    if (!id || !ID_RE.test(id)) return error(400, 'invalid id')
    const stored = await store.read(id)
    if (!stored) return error(404, 'not found')

    if (request.method === 'GET') {
      return json(200, { updatedAt: stored.updatedAt, snapshot: stored.snapshot })
    }

    if (request.method === 'PUT') {
      if (!keyMatches(request, stored)) return error(403, 'forbidden')
      const snapshot = await readSnapshot(request)
      if (!snapshot) return error(400, 'invalid snapshot')
      const updatedAt = new Date().toISOString()
      await store.write(id, { writeKeyHash: stored.writeKeyHash, updatedAt, snapshot })
      return json(200, { updatedAt })
    }

    if (request.method === 'DELETE') {
      if (!keyMatches(request, stored)) return error(403, 'forbidden')
      await store.remove(id)
      return json(200, { deleted: true })
    }

    return error(405, 'method not allowed')
  }
}

const pathOf = (id: string) => `shares/${id}.json`

/** Vercel Blob（非公開ストア）に1共有=1ファイルで保存する。 */
const blobStore: ShareStore = {
  async read(id) {
    const result = await get(pathOf(id), { access: 'private', useCache: false })
    if (!result || result.statusCode !== 200 || !result.stream) return null
    return (await new Response(result.stream).json()) as StoredShare
  },
  async write(id, value) {
    await put(pathOf(id), JSON.stringify(value), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
  },
  async remove(id) {
    await del(pathOf(id))
  },
}

const handle = createHandler(blobStore)

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await handle(request)
    } catch (e) {
      console.error(e)
      return error(500, 'server error')
    }
  },
}
