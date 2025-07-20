import { createClient } from '@blinkdotnew/sdk'

const blink = createClient({
  projectId: 'intelligent-real-estate-discovery-v02a98y5',
  authRequired: true
})

export { blink }