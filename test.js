const test = require('brittle')
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

test('migrate', async function (t) {
  const tmp = await t.tmp()

  {
    const store = new Corestore(tmp)
    await store.ready()
    await store.close()
  }

  const m = Multi.migrate(tmp)

  t.ok(m.active())
  t.is(m.active().storage, path.join(tmp, '0'))

  {
    const store = new Corestore(m.active().storage)
    await store.ready()
    await store.close()
  }

  t.pass('rebooted corestore')
})

test('migrate (slow, 10s)', async function (t) {
  const tmp = await t.tmp()

  {
    const store = new Corestore(tmp)
    await store.ready()
    await store.close()
  }

  await new Promise((resolve) => setTimeout(resolve, 10_000))

  const m = Multi.migrate(tmp)

  t.ok(m.active())
  t.is(m.active().storage, path.join(tmp, '0'))

  {
    const store = new Corestore(m.active().storage)
    await store.ready()
    await store.close()
  }

  t.pass('rebooted corestore')
})
