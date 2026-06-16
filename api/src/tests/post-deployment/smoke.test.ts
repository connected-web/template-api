import { describe, expect, it } from 'vitest'
import axios from 'axios'
import https from 'node:https'

const isSmokeOnly = process.env.POST_DEPLOYMENT_SMOKE_ONLY === 'true'
const serverDomain = process.env.POST_DEPLOYMENT_SERVER_DOMAIN ?? ''

const smokeDescribe = isSmokeOnly ? describe : describe.skip

smokeDescribe('Post-deployment smoke', () => {
  it('should resolve and respond from /openapi', async () => {
    expect(serverDomain).not.toBe('')

    const response = await axios.get(`${serverDomain}/openapi`, {
      timeout: 15000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: () => true
    })

    expect(response.status).toBe(200)
  })
})
