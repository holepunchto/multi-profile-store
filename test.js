const test = require('brittle')
const fs = require('fs')
const path = require('path')
const Corestore = require('corestore')
const Multi = require('./')

test('basic', async function (t) {
  const tmp = await t.tmp()

  const m = Multi.open(tmp)

  t.is(m.active(), null)

  const profile = m.create({ name: 'test' })

  t.is(m.active(), profile)
})

test('created profiles are provisional by default', async function (t) {
  const tmp = await t.tmp()

  const m = Multi.open(tmp)
  const profile = m.create({ name: 'test' })

  t.is(profile.confirmed, false)
})

test('confirm marks a profile as confirmed and persists', async function (t) {
  const tmp = await t.tmp()

  const m = Multi.open(tmp)
  const profile = m.create({ name: 'test' })

  t.is(m.confirm({ id: profile.id }).confirmed, true)
  t.is(m.confirm({ id: 404 }), null, 'unknown id returns null')

  t.ok(Multi.open(tmp).active().confirmed, 'confirmed flag persisted')
})

test('removeUnconfirmed demotes only provisional profiles', async function (t) {
  const tmp = await t.tmp()

  const m = Multi.open(tmp)
  const a = m.create({ name: 'a' })
  m.confirm({ id: a.id })
  m.create({ name: 'b' })

  t.is(m.list().length, 2)
  t.ok(m.removeUnconfirmed())
  t.is(m.list().length, 1)
  t.is(m.list()[0].id, a.id, 'confirmed profile kept')
})

test('removeUnconfirmed is a no-op when everything is confirmed', async function (t) {
  const tmp = await t.tmp()

  const m = Multi.open(tmp)
  const a = m.create({ name: 'a' })
  m.confirm({ id: a.id })

  t.absent(m.removeUnconfirmed())
  t.is(m.list().length, 1)
})

test('profiles without a confirmed field (legacy) are treated as confirmed', async function (t) {
  const tmp = await t.tmp()

  // a profiles.json written before the confirmed field existed
  const config = {
    version: 1,
    profiles: [{ id: 0, name: 'legacy', active: true, created: 1 }],
    gc: []
  }
  fs.mkdirSync(tmp, { recursive: true })
  fs.writeFileSync(path.join(tmp, 'profiles.json'), JSON.stringify(config))

  const m = Multi.open(tmp)

  t.ok(m.active().confirmed, 'legacy profile is confirmed')
  t.absent(m.removeUnconfirmed(), 'legacy profile is not demoted')
})

test('migrate', async function (t) {
  const tmp = await t.tmp()

  {
    const store = new Corestore(tmp)
    await store.ready()
    await store.close()
  }

  const m = Multi.migrate(tmp)

  t.ok(m.active())
  t.ok(m.active().confirmed, 'migrated profile is confirmed')
  t.is(m.active().storage, path.join(tmp, '0'))

  {
    const store = new Corestore(m.active().storage)
    await store.ready()
    await store.close()
  }

  t.pass('rebooted corestore')
})
