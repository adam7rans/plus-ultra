#!/usr/bin/env node
const webpush = require('web-push')
const vapidKeys = webpush.generateVAPIDKeys()
console.log('Add these to your environment (or .env file):\n')
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:admin@plusultra.network`)
