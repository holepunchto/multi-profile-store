const test = require('brittle')
const Multi = require('./')

test('basic', async function (t) {
  const tmp = await t.tmp()

  const m = Multi.open(tmp)

  t.is(m.active(), null)

  const profile = m.create({ name: 'test' })

  t.is(m.active(), profile)
})
