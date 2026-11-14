import { describe, expect, it } from 'vitest'
import { createHandler, type ShareStore } from '../api/share.ts'

function memoryStore(): ShareStore & { size: () => number } {
  const map = new Map<string, string>()
  return {
    async read(id) {
      const v = map.get(id)
      return v ? JSON.parse(v) : null
    },
    async write(id, value) {
      map.set(id, JSON.stringify(value))
    },
    async remove(id) {
      map.delete(id)
    },
    size: () => map.size,
  }
}

const snapshot = (n = 1) => ({
  settings: { pricePerPack: 600, monthlyGoalPacks: null },
  purchases: Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    date: '2026-11-15',
    price: 600,
    createdAt: '2026-11-15T01:00:00.000Z',
  })),
})

const req = (method: string, id: string | null, body?: unknown, key?: string) =>
  new Request(`https://example.test/api/share${id ? `?id=${id}` : ''}`, {
    method,
    headers: key ? { authorization: `Bearer ${key}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  })

async function start() {
  const store = memoryStore()
  const handle = createHandler(store)
  const res = await handle(req('POST', null, { snapshot: snapshot(1) }))
  const { id, writeKey } = (await res.json()) as { id: string; writeKey: string }
  return { store, handle, res, id, writeKey }
}

describe('共有API', () => {
  it('開始すると id と鍵が返り、id で読める', async () => {
    const { handle, res, id, writeKey } = await start()
    expect(res.status).toBe(201)
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(writeKey.length).toBeGreaterThanOrEqual(40)

    const got = await handle(req('GET', id))
    expect(got.status).toBe(200)
    const body = (await got.json()) as Record<string, unknown>
    expect(body.snapshot).toEqual(snapshot(1))
    expect(typeof body.updatedAt).toBe('string')
  })

  it('読み取りの応答に鍵やそのハッシュを含めない', async () => {
    const { handle, id, writeKey } = await start()
    const text = await (await handle(req('GET', id))).text()
    expect(text).not.toContain(writeKey)
    expect(text).not.toContain('writeKeyHash')
  })

  it('鍵があれば更新できる', async () => {
    const { handle, id, writeKey } = await start()
    const put = await handle(req('PUT', id, { snapshot: snapshot(3) }, writeKey))
    expect(put.status).toBe(200)
    const body = (await (await handle(req('GET', id))).json()) as { snapshot: { purchases: unknown[] } }
    expect(body.snapshot.purchases).toHaveLength(3)
  })

  it('鍵がない・違う場合は更新も削除もできない', async () => {
    const { handle, id } = await start()
    expect((await handle(req('PUT', id, { snapshot: snapshot(3) }))).status).toBe(403)
    expect((await handle(req('PUT', id, { snapshot: snapshot(3) }, 'wrong'))).status).toBe(403)
    expect((await handle(req('DELETE', id, undefined, 'wrong'))).status).toBe(403)
    const body = (await (await handle(req('GET', id))).json()) as { snapshot: { purchases: unknown[] } }
    expect(body.snapshot.purchases).toHaveLength(1)
  })

  it('共有をやめるとサーバーから消え、読めなくなる', async () => {
    const { store, handle, id, writeKey } = await start()
    expect((await handle(req('DELETE', id, undefined, writeKey))).status).toBe(200)
    expect(store.size()).toBe(0)
    expect((await handle(req('GET', id))).status).toBe(404)
  })

  it('存在しない id や形式の違う id は読めない', async () => {
    const { handle } = await start()
    expect((await handle(req('GET', 'A'.repeat(22)))).status).toBe(404)
    expect((await handle(req('GET', '../secret')))).toHaveProperty('status', 400)
    expect((await handle(req('GET', null)))).toHaveProperty('status', 400)
  })

  it('不正な記録は受け付けない', async () => {
    const store = memoryStore()
    const handle = createHandler(store)
    const bad = [
      {},
      { snapshot: { settings: { pricePerPack: 600, monthlyGoalPacks: null } } },
      { snapshot: { settings: { pricePerPack: -1, monthlyGoalPacks: null }, purchases: [] } },
      {
        snapshot: {
          settings: { pricePerPack: 600, monthlyGoalPacks: null },
          purchases: [{ id: 'x', date: '11/15', price: 600, createdAt: 'x' }],
        },
      },
    ]
    for (const body of bad) {
      expect((await handle(req('POST', null, body))).status).toBe(400)
    }
    expect(store.size()).toBe(0)
  })

  it('余分な項目は保存しない', async () => {
    const store = memoryStore()
    const handle = createHandler(store)
    const s = snapshot(1) as Record<string, unknown>
    const res = await handle(req('POST', null, { snapshot: { ...s, note: '秘密のメモ' } }))
    const { id } = (await res.json()) as { id: string }
    const text = await (await handle(req('GET', id))).text()
    expect(text).not.toContain('秘密のメモ')
  })
})
