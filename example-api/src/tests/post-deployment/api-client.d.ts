import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig
} from 'openapi-client-axios'

declare namespace Components {
  namespace Schemas {
    /**
         * Basic Object
         * A basic JSON object with key value pairs
         */
    export interface BasicObjectModel {
      [name: string]: any
    }
    /**
         * Data Item Deleted
         */
    export interface DataItemDeletedModel {
      message: string
    }
    /**
         * List Data Items
         */
    export interface DataItemListModel {
      items: /* Data Item */ DataItemModel[]
    }
    /**
         * Data Item
         */
    export interface DataItemModel {
      [name: string]: any
    }
    /**
         * Data Item Not Found
         */
    export interface DataItemNotFoundModel {
      message: string
    }
    /**
         * Data Item Stored
         */
    export interface DataItemStoredModel {
      message: string
    }
    /**
         * Schema Deleted
         */
    export interface SchemaDeletedModel {
      message: string
    }
    /**
         * List Schemas
         */
    export interface SchemaListModel {
      schemaIds?: string[]
    }
    /**
         * Schema Not Found
         */
    export interface SchemaNotFoundModel {
      message: string
    }
    /**
         * Schema Stored
         */
    export interface SchemaStoredModel {
      message: string
    }
    /**
         * Status
         */
    export interface StatusResponseModel {
      /**
             * The UTC timestamp representing the last time the server was updated
             */
      deploymentTime: string
    }
    /**
         * Stored Schema
         */
    export interface StorableSchemaModel {
      $schema: string
      title: string
    }
  }
}
declare namespace Paths {
  namespace Data$SchemaId {
    namespace Options {
      namespace Parameters {
        export type SchemaId = string
      }
      export interface PathParameters {
        schemaId: Parameters.SchemaId
      }
    }
  }
  namespace Data$SchemaId$ItemId {
    namespace Options {
      namespace Parameters {
        export type ItemId = string
        export type SchemaId = string
      }
      export interface PathParameters {
        schemaId: Parameters.SchemaId
        itemId: Parameters.ItemId
      }
    }
  }
  namespace DeleteData {
    namespace Parameters {
      export type ItemId = string
      export type SchemaId = string
    }
    export interface PathParameters {
      schemaId: Parameters.SchemaId
      itemId: Parameters.ItemId
    }
    namespace Responses {
      export type $200 = /* Data Item Deleted */ Components.Schemas.DataItemDeletedModel
    }
  }
  namespace DeleteSchema {
    namespace Parameters {
      export type SchemaId = string
    }
    export interface PathParameters {
      schemaId: Parameters.SchemaId
    }
    namespace Responses {
      export type $200 = /* Schema Deleted */ Components.Schemas.SchemaDeletedModel
    }
  }
  namespace GetData {
    namespace Parameters {
      export type ItemId = string
      export type SchemaId = string
    }
    export interface PathParameters {
      schemaId: Parameters.SchemaId
      itemId: Parameters.ItemId
    }
    namespace Responses {
      export type $200 = /* Data Item */ Components.Schemas.DataItemModel
      export type $404 = /* Data Item Not Found */ Components.Schemas.DataItemNotFoundModel
    }
  }
  namespace GetOpenAPISpec {
    namespace Responses {
      export type $200 = /**
             * Basic Object
             * A basic JSON object with key value pairs
             */
            Components.Schemas.BasicObjectModel
    }
  }
  namespace GetSchema {
    namespace Parameters {
      export type SchemaId = string
    }
    export interface PathParameters {
      schemaId: Parameters.SchemaId
    }
    namespace Responses {
      export type $200 = /* Stored Schema */ Components.Schemas.StorableSchemaModel
      export type $404 = /* Schema Not Found */ Components.Schemas.SchemaNotFoundModel
    }
  }
  namespace GetStatus {
    namespace Responses {
      export type $200 = /* Status */ Components.Schemas.StatusResponseModel
    }
  }
  namespace Items$SchemaId {
    namespace Options {
      namespace Parameters {
        export type SchemaId = string
      }
      export interface PathParameters {
        schemaId: Parameters.SchemaId
      }
    }
  }
  namespace ListItems {
    namespace Parameters {
      export type SchemaId = string
    }
    export interface PathParameters {
      schemaId: Parameters.SchemaId
    }
    namespace Responses {
      export type $200 = /* List Data Items */ Components.Schemas.DataItemListModel
    }
  }
  namespace ListSchemas {
    namespace Responses {
      export type $200 = /* List Schemas */ Components.Schemas.SchemaListModel
    }
  }
  namespace PutData {
    namespace Parameters {
      export type ItemId = string
      export type SchemaId = string
    }
    export interface PathParameters {
      schemaId: Parameters.SchemaId
      itemId: Parameters.ItemId
    }
    export type RequestBody = /* Data Item */ Components.Schemas.DataItemModel
    namespace Responses {
      export type $200 = /* Data Item Stored */ Components.Schemas.DataItemStoredModel
    }
  }
  namespace PutSchema {
    namespace Parameters {
      export type SchemaId = string
    }
    export interface PathParameters {
      schemaId: Parameters.SchemaId
    }
    export type RequestBody = /* Stored Schema */ Components.Schemas.StorableSchemaModel
    namespace Responses {
      export type $200 = /* Schema Stored */ Components.Schemas.SchemaStoredModel
    }
  }
  namespace Schema$SchemaId {
    namespace Options {
      namespace Parameters {
        export type SchemaId = string
      }
      export interface PathParameters {
        schemaId: Parameters.SchemaId
      }
    }
  }
}

export interface OperationMethods {
  /**
   * getSchema
   */
  'getSchema': (
    parameters?: Parameters<Paths.GetSchema.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.GetSchema.Responses.$200>
  /**
   * putSchema
   */
  'putSchema': (
    parameters?: Parameters<Paths.PutSchema.PathParameters> | null,
    data?: Paths.PutSchema.RequestBody,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.PutSchema.Responses.$200>
  /**
   * deleteSchema
   */
  'deleteSchema': (
    parameters?: Parameters<Paths.DeleteSchema.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.DeleteSchema.Responses.$200>
  /**
   * getStatus
   */
  'getStatus': (
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.GetStatus.Responses.$200>
  /**
   * getData
   */
  'getData': (
    parameters?: Parameters<Paths.GetData.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.GetData.Responses.$200>
  /**
   * putData
   */
  'putData': (
    parameters?: Parameters<Paths.PutData.PathParameters> | null,
    data?: Paths.PutData.RequestBody,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.PutData.Responses.$200>
  /**
   * deleteData
   */
  'deleteData': (
    parameters?: Parameters<Paths.DeleteData.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.DeleteData.Responses.$200>
  /**
   * listItems
   */
  'listItems': (
    parameters?: Parameters<Paths.ListItems.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.ListItems.Responses.$200>
  /**
   * getOpenAPISpec
   */
  'getOpenAPISpec': (
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.GetOpenAPISpec.Responses.$200>
  /**
   * listSchemas
   */
  'listSchemas': (
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ) => OperationResponse<Paths.ListSchemas.Responses.$200>
}

export interface PathsDictionary {
  ['/items']: {
  }
  ['/data/{schemaId}']: {
  }
  ['/schema/{schemaId}']: {
    /**
     * getSchema
     */
    'get': (
      parameters?: Parameters<Paths.GetSchema.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.GetSchema.Responses.$200>
    /**
     * putSchema
     */
    'put': (
      parameters?: Parameters<Paths.PutSchema.PathParameters> | null,
      data?: Paths.PutSchema.RequestBody,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.PutSchema.Responses.$200>
    /**
     * deleteSchema
     */
    'delete': (
      parameters?: Parameters<Paths.DeleteSchema.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.DeleteSchema.Responses.$200>
  }
  ['/status']: {
    /**
     * getStatus
     */
    'get': (
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.GetStatus.Responses.$200>
  }
  ['/data/{schemaId}/{itemId}']: {
    /**
     * getData
     */
    'get': (
      parameters?: Parameters<Paths.GetData.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.GetData.Responses.$200>
    /**
     * putData
     */
    'put': (
      parameters?: Parameters<Paths.PutData.PathParameters> | null,
      data?: Paths.PutData.RequestBody,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.PutData.Responses.$200>
    /**
     * deleteData
     */
    'delete': (
      parameters?: Parameters<Paths.DeleteData.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.DeleteData.Responses.$200>
  }
  ['/schema']: {
  }
  ['/items/{schemaId}']: {
    /**
     * listItems
     */
    'get': (
      parameters?: Parameters<Paths.ListItems.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.ListItems.Responses.$200>
  }
  ['/data']: {
  }
  ['/openapi']: {
    /**
     * getOpenAPISpec
     */
    'get': (
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.GetOpenAPISpec.Responses.$200>
  }
  ['/']: {
  }
  ['/schemas']: {
    /**
     * listSchemas
     */
    'get': (
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ) => OperationResponse<Paths.ListSchemas.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
