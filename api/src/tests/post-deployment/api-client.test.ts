import { expect, describe, it, beforeAll, afterAll } from '@jest/globals'

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

const {
  POST_DEPLOYMENT_SERVER_DOMAIN,
  POST_DEPLOYMENT_AUTH_URL,
  POST_DEPLOYMENT_CLIENT_ID,
  POST_DEPLOYMENT_CLIENT_SECRET,
  CONNECTED_WEB_DEV_SSO_CLIENT_ID,
  CONNECTED_WEB_DEV_SSO_SECRET,
  CONNECTED_WEB_PROD_SSO_CLIENT_ID,
  CONNECTED_WEB_PROD_SSO_SECRET
} = process.env

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
    clientId: CONNECTED_WEB_DEV_SSO_CLIENT_ID as string,
    clientSecret: CONNECTED_WEB_DEV_SSO_SECRET as string,
    oauthTokenEndpoint: 'https://connected-web-dev.auth.eu-west-2.amazoncognito.com/oauth2/token',
    serviceUnderTest: 'https://template-api.dev.connected-web.services'
  },
  prod: {
    clientId: CONNECTED_WEB_PROD_SSO_CLIENT_ID as string,
    clientSecret: CONNECTED_WEB_PROD_SSO_SECRET as string,
    oauthTokenEndpoint: 'https://connected-web.auth.eu-west-2.amazoncognito.com/oauth2/token',
    serviceUnderTest: 'https://template-api.prod.connected-web.services'
  },
  ci: {
    clientId: POST_DEPLOYMENT_CLIENT_ID as string,
    clientSecret: POST_DEPLOYMENT_CLIENT_SECRET as string,
    oauthTokenEndpoint: POST_DEPLOYMENT_AUTH_URL as string,
    serviceUnderTest: POST_DEPLOYMENT_SERVER_DOMAIN as string
  }
}

const clientConfig = POST_DEPLOYMENT_AUTH_URL !== undefined ? clientConfigs.ci : clientConfigs.dev
console.log('Using client config:', { clientConfig })
const serverConfig: ServerInfo = {
  baseURL: clientConfig.serviceUnderTest,
  headers: {
    authorization: 'Bearer not-specified',
    'content-type': 'application/json'
  }
}

async function getOAuthToken (): Promise<string> {
  const { clientId, clientSecret, oauthTokenEndpoint } = clientConfig
  const requestPayload = [
    'grant_type=client_credentials',
    `client_id=${clientId}`
  ].join('&')
  const requestHeaders = {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    authorization: `Basic ${btoa([clientId, clientSecret].join(':'))}`
  }
  const tokenResponse = await axios.post(oauthTokenEndpoint, requestPayload, { headers: requestHeaders })
  return tokenResponse?.data?.access_token ?? 'not-set'
}

describe('Open API Spec', () => {
  let openapiDoc: Document
  const downloadedOpenAPIDocPath = path.join(__dirname, './downloaded-app-openapi.json')

  console.log('Server:', { serverConfig })

  beforeAll(async () => {
    console.log('Implicit test: it should download the openapi spec for the App Store from /openapi')
    const oauthToken = await getOAuthToken()
    console.log('Received OAuth Token:', { oauthToken })
    serverConfig.headers.authorization = `Bearer ${oauthToken}`
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
        title: 'Schema API DB',
        description: 'Schema API DB - https://github.com/connected-web/template-api'
      })
    })

    it('should contain a list of paths', async () => {
      const pathStrings = Object.keys(openapiDoc.paths as any).sort()
      expect(pathStrings).toEqual([
        '/',
        '/data',
        '/data/{schemaId}',
        '/data/{schemaId}/{itemId}',
        '/data/{schemaId}/{itemId}/versions',
        '/data/{schemaId}/{itemId}/versions/{versionId}',
        '/items',
        '/items/{schemaId}',
        '/openapi',
        '/schema',
        '/schema/{schemaId}',
        '/schemas',
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
          'getStatus',
          'listSchemas',
          'getSchema',
          'putSchema',
          'deleteSchema'
        ])
      )
    })
  })

  describe('Basic Client Endpoints', () => {
    let appClient: ApiClientUnderTest
    beforeAll(async () => {
      const axiosApi = new OpenAPIClientAxios({
        definition: openapiDoc,
        axiosConfigDefaults: {
          headers: serverConfig.headers,
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
  })

  describe('Schema Endpoints', () => {
    let appClient: ApiClientUnderTest
    beforeAll(async () => {
      const axiosApi = new OpenAPIClientAxios({
        definition: openapiDoc,
        axiosConfigDefaults: {
          headers: serverConfig.headers,
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

    const testSchema = { $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Post Deployment Test Schema' }

    it('should be possible to create or update a schema', async () => {
      const response = await appClient.putSchema({ schemaId: 'post-deployment-test-id' }, testSchema)

      console.log('Put Schema:', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/SchemaStoredModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data.message).toEqual(`PUT /schema/post-deployment-test-id success (${JSON.stringify(testSchema).length} bytes)`)
    })

    it('should handle schema compilation error', async () => {
      // Simulate a schema compilation error
      const invalidSchema = { type: 'invalid_type' }
      const response = await appClient.putSchema({ schemaId: 'invalid-schema' }, invalidSchema as any)

      expect(response.status).toEqual(400)
      expect(response.data).toHaveProperty('message', 'Unable to compile schema: schema is invalid: data/type must be equal to one of the allowed values, data/type must be array, data/type must match a schema in anyOf')
    })

    it('should be possible to get an existing schema', async () => {
      const response = await appClient.getSchema({ schemaId: 'post-deployment-test-id' })

      console.log('Get Schema (existing):', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/StorableSchemaModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data).toEqual(testSchema)
    })

    it('should be possible to get a non-existing schema', async () => {
      const response = await appClient.getSchema({ schemaId: 'post-deployment-test-non-existing-id' })

      console.log('Get Schema (non-existing):', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/SchemaNotFoundModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect((response.data as any).message).toEqual('Unable to find schema with post-deployment-test-non-existing-id. Error: The specified key does not exist.')
    })

    it('should be possible to list available schemas', async () => {
      const response = await appClient.listSchemas()

      console.log('List Schemas:', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/SchemaListModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data).toEqual({ schemaIds: ['post-deployment-test-id'] })
    })

    it('should be possible to delete a schema', async () => {
      const response = await appClient.deleteSchema({ schemaId: 'post-deployment-test-id' })

      console.log('Delete Schema:', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/SchemaDeletedModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data.message).toEqual('DELETE /schema/post-deployment-test-id OK')
    })
  })

  describe('Data Item Endpoints', () => {
    let appClient: ApiClientUnderTest
    const testSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Post Deployment Test Schema',
      properties: {
        name: {
          type: 'string'
        },
        timestamp: {
          type: 'string',
          format: 'date-time'
        }
      },
      required: ['name', 'timestamp'],
      allowedAdditionalProperties: false
    }
    const testSchemaId = 'post-deployment-data-item-test-id'
    const testDataItem = { name: 'Test Item (xyz-123)', timestamp: (new Date()).toISOString() }

    beforeAll(async () => {
      const axiosApi = new OpenAPIClientAxios({
        definition: openapiDoc,
        axiosConfigDefaults: {
          headers: serverConfig.headers,
          validateStatus: function (status) {
            return status >= 200 // don't throw errors on non-200 codes
          }
        }
      })

      appClient = await axiosApi.getClient<ApiClientUnderTest>()
      appClient.interceptors.response.use((response) => response, (error) => {
        console.log('Caught client error:', error.message)
      })

      const putSchemaResponse = await appClient.putSchema({ schemaId: testSchemaId }, testSchema)
      console.log('Put Data Item Schema:', putSchemaResponse.status, putSchemaResponse.statusText, JSON.stringify(putSchemaResponse.data, null, 2))
    })

    afterAll(async () => {
      const deleteSchemaResponse = await appClient.deleteSchema({ schemaId: testSchemaId }, testSchema)
      console.log('Delete Data Item Schema:', deleteSchemaResponse.status, deleteSchemaResponse.statusText, JSON.stringify(deleteSchemaResponse.data, null, 2))
    })

    it('should be possible to create or update a data item against an existing schema', async () => {
      const testItemId = 'xyz-123'
      const response = await appClient.putData({ schemaId: testSchemaId, itemId: testItemId }, testDataItem)

      console.log('Put Data Item:', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/DataItemModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data.message).toEqual('PUT /data/post-deployment-data-item-test-id/xyz-123 success')
    })

    it('should handle data validation error', async () => {
      try {
        await appClient.deleteData({ schemaId: testSchemaId, itemId: 'invalid-data' })
      } catch (ex) {
        const error = ex as Error
        console.error('Caught error:', error.message, 'while deleting invalid data item')
      }
      // Simulate a data validation error
      const invalidData = { name: 123, timestamp: (new Date()).toISOString() } // Name should be a string
      const response = await appClient.putData({ schemaId: testSchemaId, itemId: 'invalid-data' }, invalidData)

      expect(response.status).toEqual(400)
      expect(response.data).toHaveProperty('message', 'Unable to validate data: [{"instancePath":"/name","schemaPath":"#/properties/name/type","keyword":"type","params":{"type":"string"},"message":"must be string"}]')
    })

    it('should be possible to get an existing stored data item', async () => {
      const response = await appClient.getData({ schemaId: testSchemaId, itemId: 'xyz-123' })

      console.log('Get Data Item (existing):', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/DataItemModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data).toEqual(testDataItem)
    })

    it('should be possible to get a non-existing data item - based on non-existing schema id', async () => {
      const response = await appClient.getData({ schemaId: 'non-existing-schema-id', itemId: 'xyz-123' })

      console.log('Get Data Item (non-existing schema id):', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/DataItemNotFoundModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect((response.data as any).message).toEqual('Unable to find data with schemaId: non-existing-schema-id and itemId: xyz-123. Error: The specified key does not exist.')
    })

    it('should be possible to get a non-existing data item - based on non-existing item id', async () => {
      const response = await appClient.getData({ schemaId: testSchemaId, itemId: 'non-existing' })

      console.log('Get Data Item (non-existing item id):', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/DataItemNotFoundModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect((response.data as any).message).toEqual('Unable to find data with schemaId: post-deployment-data-item-test-id and itemId: non-existing. Error: The specified key does not exist.')
    })

    it('should be possible to list available data items associated with a schema id', async () => {
      const response = await appClient.listItems({ schemaId: testSchemaId })

      console.log(`List Data Items: ${testSchemaId}`, response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/DataItemListModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data).toEqual({ itemIds: ['xyz-123'] })
    })

    it('should be possible to delete a data item', async () => {
      const response = await appClient.deleteData({ schemaId: testSchemaId, itemId: 'xyz-123' })

      console.log('Delete Schema:', response.status, response.statusText, JSON.stringify(response.data, null, 2))

      ajv.validate({ $ref: 'app-openapi.json#/components/schemas/SchemaDeletedModel' }, response.data)
      expect(ajv.errors ?? []).toEqual([])
      expect(response.data.message).toEqual('DELETE /data/post-deployment-data-item-test-id/xyz-123 OK')
    })
  })
})
