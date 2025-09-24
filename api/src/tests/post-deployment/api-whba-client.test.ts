import { expect, describe, it, beforeAll } from '@jest/globals'

import axios from 'axios'
import OpenAPIClientAxios, { Document } from 'openapi-client-axios'
import { Client as ApiClientUnderTest } from './api-client'

import fs from 'node:fs/promises'
import path from 'node:path'

import Ajv from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import draft7MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json'

const ajv = new Ajv({ allErrors: true, strict: false })
ajv.addMetaSchema(draft7MetaSchema)
addFormats(ajv)

interface ServerInfo {
  baseURL: string
  headers: {
    [param: string]: string
  }
}

const clientConfigs = {
  'not-set': {
    error: 'No mode set; use --dev or --prod to specify credentials realm'
  },
  dev: {
    serviceUnderTest: 'https://template-api-whba.dev.connected-web.services'
  },
  prod: {
    serviceUnderTest: 'https://template-api-whba.prod.connected-web.services'
  },
  ci: {
    serviceUnderTest: 'https://template-api-whba.dev.connected-web.services'
  }
}

function randomUUID (): string {
  // Generate a properly formatted UUID v4 for test purposes
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Fixed: Removed Content-Type and Accept from required headers in API config
// Now any properly formatted UUID should work with any standard HTTP client
const clientConfig = process.env.POST_DEPLOYMENT_AUTH_URL !== undefined ? clientConfigs.ci : clientConfigs.dev
console.log('Using client config:', { clientConfig })
const serverConfig: ServerInfo = {
  baseURL: clientConfig.serviceUnderTest,
  headers: {
    'content-type': 'application/json',
    'accept': 'application/json',
    'user-agent': 'github.com/connected-web/template-api post-deployment-tests/1.0',
    'x-website-authcode': randomUUID()
  }
}

describe('Open API Spec', () => {
  let openapiDoc: Document
  const downloadedOpenAPIDocPath = path.join(__dirname, './downloaded-app-openapi.json')

  console.log('Server:', { serverConfig })

  beforeAll(async () => {
    console.log('Implicit test: it should download the openapi spec for the App Store from /openapi')
    const basicClient = axios.create(serverConfig)
    console.log('Created basic Axios client using:', { serverConfig })

    const response = await basicClient.get('/openapi')
    openapiDoc = response.data
    const fileBody = JSON.stringify(openapiDoc, null, 2)
    await fs.writeFile(downloadedOpenAPIDocPath, fileBody, 'utf-8')
    console.log('Downloaded Open API Spec from /openapi endpoint:', { bytes: fileBody.length }, 'to', downloadedOpenAPIDocPath)
    ajv.addSchema(openapiDoc, 'app-openapi.json')
  })

  describe('Open API Document', () => {
    it('should contain an info block with title and description', async () => {
      const { version, ...testableProps } = openapiDoc.info
      expect(testableProps).toEqual({
        title: 'Template API',
        description: 'Template API - https://github.com/connected-web/template-api'
      })
    })

    it('should contain a list of paths', async () => {
      const pathStrings = Object.keys(openapiDoc.paths as any).sort()
      expect(pathStrings).toEqual([
        '/',
        '/openapi',
        '/status'
      ])
    })

    it('should be possible to create an Open API Client based on the spec', async () => {
      // Note: this requires a manual run of: npm run typegen:for-post-deployment
      // Which uses the openapi-client-axios-typegen package to create appStore-client.d.ts
      const axiosApi = new OpenAPIClientAxios({ definition: openapiDoc, axiosConfigDefaults: { headers: serverConfig.headers } })
      const appStoreClient = await axiosApi.getClient()
      const actualClientKeys = Object.keys(appStoreClient)
      expect(actualClientKeys).toEqual(
        expect.arrayContaining([
          'getOpenAPISpec',
          'getStatus'
        ])
      )
    })
  })

  describe('Basic Client Endpoints with Header Based Authentication', () => {
    let appClient: ApiClientUnderTest
    beforeAll(async () => {
      const axiosApi = new OpenAPIClientAxios({
        definition: openapiDoc,
        axiosConfigDefaults: {
          headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'user-agent': 'github.com/connected-web/template-api post-deployment-tests/1.0',
            'x-website-authcode': randomUUID()
          },
          validateStatus: function (status) {
            return status >= 200 // don't throw errors on non-200 codes
          }
        }
      })

      appClient = await axiosApi.getClient<ApiClientUnderTest>()
      appClient.interceptors.response.use((response) => response, (error) => {
        console.log('Caught client error:', error.message)
      })
    })

    it('should be possible to getOpenAPISpec', async () => {
      const response = await appClient.getOpenAPISpec()

      console.log('Get Open API Spec:', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/BasicObjectModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
    })

    it('should be possible to getStatus', async () => {
      const response = await appClient.getStatus()

      console.log('Get Status:', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/BasicObjectModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
    })

    it('should fail to getStatus with missing or incorrect header', async () => {
      const originalAuthCode = appClient.defaults.headers['x-website-authcode']

      // Test with an improperly formatted UUID (should fail regex validation)
      appClient.defaults.headers['x-website-authcode'] = 'invalid-uuid-format'

      const response = await appClient.getStatus()
      console.log('Get Status with invalid UUID format:', response.status, response.statusText, JSON.stringify(response.data, null, 2))
      expect(response.status).toEqual(403) // Should be 403 for invalid UUID format

      delete appClient.defaults.headers['x-website-authcode']
      const response2 = await appClient.getStatus()
      console.log('Get Status with missing auth code:', response2.status, response2.statusText, JSON.stringify(response2.data, null, 2))
      expect(response2.status).toEqual(401) // Should be 401 for missing required header

      appClient.defaults.headers['x-website-authcode'] = originalAuthCode
    })
  })
})
