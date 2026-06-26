# multi-profile-store

Manage multiple corestores easily in a multi profile setup

```
npm install multi-profile-store
```

Note that all io is sync for simplicity.

## Usage

```js
const MultiProfileStore = require('multi-profile-store')

// open one
const p = MultiProfileStore.open('./profiles')

// if you might have made a single corestore first and want to move to this setup, use migrate
const p = MultiProfileStore.migrate('./profiles')

// active profile, ie { id, name, storage, confirmed } or null
p.active()

// list all profiles
p.list()

// gc removed profiles, optionally pass a delay to gc only profiles removed after that delay (relative)
p.gc({ delay: 0 })

// remove a profile, moves it to gc list, not removed until gc is run above
p.remove({ id })

// update to be active or not
p.update({ id, active: true })

// create a new profile, optionally pass a name, returns { id, name, storage, confirmed }
// new profiles are provisional (confirmed: false) until you confirm them
p.create({ name: 'test' })

// mark a profile as fully set up so it survives removeUnconfirmed()
p.confirm({ id })

// move every provisional (never-confirmed) profile to the gc list.
p.removeUnconfirmed()
```

## License

Apache-2.0
