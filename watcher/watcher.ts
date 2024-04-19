import exec from '@cush/exec'

const profileId = 'cm0tuo06.dev-edition-default'
const userContextId = '4294967295'
const extensionId = 'af456a87-7919-4ca0-b9f3-b0cc9d5ea1cb'

const dbPath =
  process.env.HOME +
  `/Library/Application Support/Firefox/Profiles/${profileId}/storage/default/moz-extension+++${extensionId}^userContextId=${userContextId}/idb/3647222921wleabcEoxlt-eengsairo.sqlite`

const extStorageData = exec.sync(`moz-idb-edit --dbpath`, [dbPath])
const extStorage = JSON.parse(extStorageData)
