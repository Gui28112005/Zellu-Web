// Rode: node scripts/generate-vapid.js
// Copie os valores gerados para os secrets do Worker
const { generateVAPIDKeys } = require('web-push')
const keys = generateVAPIDKeys()
console.log('=== Chaves VAPID geradas ===')
console.log('VAPID_PUBLIC_KEY:', keys.publicKey)
console.log('VAPID_PRIVATE_KEY:', keys.privateKey)
console.log('')
console.log('Adicione ao .env do zellu-web:')
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log('')
console.log('Adicione como secrets do Worker:')
console.log('  wrangler secret put VAPID_PUBLIC_KEY')
console.log('  wrangler secret put VAPID_PRIVATE_KEY')
