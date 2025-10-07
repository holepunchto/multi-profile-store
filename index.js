const fs = require('fs')
const path = require('path')
const { isWindows } = require('which-runtime')

const LATEST_VERSION = 1

module.exports = class MultiProfileStore {
  constructor(dir, config) {
    this.directory = dir
    this.version = config.version

    this._profiles = config.profiles.map((p) => {
      return {
        id: p.id,
        name: p.name,
        active: !!p.active,
        created: p.created,
        storage: path.join(dir, p.id + '')
      }
    })

    this._gc = config.gc.map((p) => {
      return {
        id: p.id,
        name: p.name,
        created: p.created,
        removed: p.removed,
        storage: path.join(dir, p.id)
      }
    })
  }

  sync() {
    const data = {
      version: this.version,
      profiles: this._profiles.map((p) => {
        return {
          id: p.id,
          name: p.name,
          active: p.active,
          created: p.created
        }
      }),
      gc: this._gc.map((p) => {
        return {
          id: p.id,
          name: p.name,
          created: p.created,
          removed: p.removed
        }
      })
    }

    fs.mkdirSync(this.directory, { recursive: true })
    fs.writeFileSync(path.join(this.directory, 'profiles-next.json'), JSON.stringify(data, null, 2))

    if (isWindows) {
      try {
        fs.unlinkSync(path.join(this.directory, 'profiles.json'))
      } catch {}
    }

    try {
      fs.renameSync(
        path.join(this.directory, 'profiles-next.json'),
        path.join(this.directory, 'profiles.json')
      )
    } catch {}
  }

  gc({ delay = 0 } = {}) {
    for (let i = 0; i < this._gc.length; i++) {
      const p = this._gc[i]
      if (delay && p.removed + delay > Date.now()) continue
      this._gc.splice(i--, 1)
      try {
        fs.rmSync(p.storage, { recursive: true, force: true })
      } catch {}
      this.sync()
    }
  }

  exists({ id }) {
    for (const p of this._profiles) {
      if (p.id === id) return true
    }
    return false
  }

  update({ id, active = true }) {
    for (const p of this._profiles) {
      if (p.id === id) {
        if (active) this._markAllInactive()
        p.active = active
        this.sync()
        return p
      }
    }

    return null
  }

  _markAllInactive() {
    for (const p of this._profiles) {
      p.active = false
    }
  }

  _next() {
    let id = 0

    for (const p of this._profiles) {
      id = Math.max(id, p.id + 1)
    }

    for (const p of this._gc) {
      id = Math.max(id, p.id + 1)
    }

    return id
  }

  create({ active = true, id = this._next(), name = null, created = Date.now() } = {}) {
    if (this.exists({ id })) return null

    const p = {
      id,
      name,
      active,
      created,
      storage: path.join(this.directory, id + '')
    }

    if (active) this._markAllInactive()
    this._profiles.push(p)
    this.sync()
    return p
  }

  remove({ id, removed = Date.now() }) {
    for (let i = 0; i < this._profiles.length; i++) {
      const p = this._profiles[i]

      if (p.id === id) {
        this._profiles.splice(i, 1)
        this._gc.push({
          id: p.id,
          name: p.name,
          created: p.created,
          removed,
          storage: p.storage
        })
        this.sync()
        return true
      }
    }

    return false
  }

  list() {
    return this._profiles
  }

  active() {
    for (const profile of this._profiles) {
      if (profile.active) return profile
    }
    return null
  }

  static open(dir, { version = LATEST_VERSION } = {}) {
    let config = null

    try {
      config = JSON.parse(fs.readFileSync(path.join(dir, 'profiles.json'), 'utf-8'))
    } catch {}

    if (!config) {
      // windows
      try {
        config = JSON.parse(fs.readFileSync(path.join(dir, 'profiles-next.json'), 'utf-8'))
      } catch {}
    }

    if (!config) config = {}

    if (config.version === undefined) config.version = version
    if (!(config.version <= LATEST_VERSION)) throw new Error('Unknown version: ' + config.version)

    if (!config.profiles) config.profiles = []
    if (!config.gc) config.gc = []

    return new MultiProfileStore(dir, config)
  }

  static migrate(dir) {
    const p = MultiProfileStore.open(dir, { version: 0 })
    if (p.active()) return p

    const dst = path.join(dir, '0')

    if (fs.existsSync(path.join(dir, 'CORESTORE')) && p.version === 0) {
      if (!fs.existsSync(dst)) {
        fs.mkdirSync(dst)
      }
      if (!fs.existsSync(path.join(dst, 'cores')) && fs.existsSync(path.join(dir, 'cores'))) {
        fs.renameSync(path.join(dir, 'cores'), path.join(dst, 'cores'))
      }
      if (!fs.existsSync(path.join(dst, 'db')) && fs.existsSync(path.join(dir, 'db'))) {
        fs.renameSync(path.join(dir, 'db'), path.join(dst, 'db'))
      }
      p.version = LATEST_VERSION
      p.create({ name: null, id: 0 })
      fs.unlinkSync(path.join(dir, 'CORESTORE')) // technically this might not run but no big deal
    }

    return p
  }
}
