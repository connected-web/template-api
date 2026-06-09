import { Construct } from 'constructs'
import { GatewayResponse, IRestApi, ResponseType } from 'aws-cdk-lib/aws-apigateway'

interface StandardGatewayResponseConfig {
  responseType: ResponseType
  responseTypeName: string
  statusCode: string
  sequence: string
  typeLabel: string
  errorClass: string
}

interface ApplyStandardGatewayResponsesOptions {
  debug?: boolean
}

const gatewayCorsHeaders = {
  'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
  'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Netacea-Rbac-Debug'",
  'gatewayresponse.header.Access-Control-Allow-Methods': "'GET,POST,PUT,PATCH,DELETE,OPTIONS'",
  'gatewayresponse.header.Access-Control-Allow-Credentials': "'true'"
}

const status401: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.UNAUTHORIZED, responseTypeName: 'UNAUTHORIZED', statusCode: '401', sequence: '19', typeLabel: 'Unauthorized', errorClass: 'Authentication error' }
]

const status400: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.BAD_REQUEST_BODY, responseTypeName: 'BAD_REQUEST_BODY', statusCode: '400', sequence: '05', typeLabel: 'Bad request body', errorClass: 'Validation error' },
  { responseType: ResponseType.BAD_REQUEST_PARAMETERS, responseTypeName: 'BAD_REQUEST_PARAMETERS', statusCode: '400', sequence: '06', typeLabel: 'Bad request parameters', errorClass: 'Validation error' },
  { responseType: ResponseType.DEFAULT_4XX, responseTypeName: 'DEFAULT_4XX', statusCode: '400', sequence: '07', typeLabel: 'Default 4XX', errorClass: 'Client error' }
]

const status403: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.ACCESS_DENIED, responseTypeName: 'ACCESS_DENIED', statusCode: '403', sequence: '01', typeLabel: 'Access denied', errorClass: 'Authorization error' },
  { responseType: ResponseType.EXPIRED_TOKEN, responseTypeName: 'EXPIRED_TOKEN', statusCode: '403', sequence: '09', typeLabel: 'Expired token', errorClass: 'Authentication error' },
  { responseType: ResponseType.INVALID_API_KEY, responseTypeName: 'INVALID_API_KEY', statusCode: '403', sequence: '12', typeLabel: 'Invalid API key', errorClass: 'Authentication error' },
  { responseType: ResponseType.INVALID_SIGNATURE, responseTypeName: 'INVALID_SIGNATURE', statusCode: '403', sequence: '13', typeLabel: 'Invalid signature', errorClass: 'Authentication error' },
  { responseType: ResponseType.MISSING_AUTHENTICATION_TOKEN, responseTypeName: 'MISSING_AUTHENTICATION_TOKEN', statusCode: '403', sequence: '14', typeLabel: 'Missing authentication token', errorClass: 'Authentication error' },
  { responseType: ResponseType.WAF_FILTERED, responseTypeName: 'WAF_FILTERED', statusCode: '403', sequence: '21', typeLabel: 'WAF filtered', errorClass: 'Security policy error' }
]

const status404: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.RESOURCE_NOT_FOUND, responseTypeName: 'RESOURCE_NOT_FOUND', statusCode: '404', sequence: '17', typeLabel: 'Resource not found', errorClass: 'Routing error' }
]

const status413: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.REQUEST_TOO_LARGE, responseTypeName: 'REQUEST_TOO_LARGE', statusCode: '413', sequence: '16', typeLabel: 'Request too large', errorClass: 'Request error' }
]

const status415: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.UNSUPPORTED_MEDIA_TYPE, responseTypeName: 'UNSUPPORTED_MEDIA_TYPE', statusCode: '415', sequence: '20', typeLabel: 'Unsupported media type', errorClass: 'Request error' }
]

const status429: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.QUOTA_EXCEEDED, responseTypeName: 'QUOTA_EXCEEDED', statusCode: '429', sequence: '15', typeLabel: 'Quota exceeded', errorClass: 'Rate limit error' },
  { responseType: ResponseType.THROTTLED, responseTypeName: 'THROTTLED', statusCode: '429', sequence: '18', typeLabel: 'Throttled', errorClass: 'Rate limit error' }
]

const status500: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.API_CONFIGURATION_ERROR, responseTypeName: 'API_CONFIGURATION_ERROR', statusCode: '500', sequence: '02', typeLabel: 'API configuration error', errorClass: 'Server error' },
  { responseType: ResponseType.AUTHORIZER_CONFIGURATION_ERROR, responseTypeName: 'AUTHORIZER_CONFIGURATION_ERROR', statusCode: '500', sequence: '03', typeLabel: 'Authorizer configuration error', errorClass: 'Server error' },
  { responseType: ResponseType.AUTHORIZER_FAILURE, responseTypeName: 'AUTHORIZER_FAILURE', statusCode: '500', sequence: '04', typeLabel: 'Authorizer failure', errorClass: 'Server error' },
  { responseType: ResponseType.DEFAULT_5XX, responseTypeName: 'DEFAULT_5XX', statusCode: '500', sequence: '08', typeLabel: 'Default 5XX', errorClass: 'Server error' }
]

const status504: StandardGatewayResponseConfig[] = [
  { responseType: ResponseType.INTEGRATION_FAILURE, responseTypeName: 'INTEGRATION_FAILURE', statusCode: '504', sequence: '10', typeLabel: 'Integration failure', errorClass: 'Upstream error' },
  { responseType: ResponseType.INTEGRATION_TIMEOUT, responseTypeName: 'INTEGRATION_TIMEOUT', statusCode: '504', sequence: '11', typeLabel: 'Integration timeout', errorClass: 'Upstream timeout' }
]

const standardGatewayResponses: StandardGatewayResponseConfig[] = [
  ...status400,
  ...status401,
  ...status403,
  ...status404,
  ...status413,
  ...status415,
  ...status429,
  ...status500,
  ...status504
]

const formatMessage = ({ statusCode, sequence, typeLabel, errorClass }: StandardGatewayResponseConfig, debug: boolean): string => {
  const standardMessage = `N-${statusCode}-${sequence}: ${typeLabel} - ${errorClass}`

  if (!debug) {
    return `{ "message": "${standardMessage}" }`
  }

  return `{
  "message": "${standardMessage}",
  "debug": {
    "responseType": "$context.error.responseType",
    "message": "$context.error.messageString",
    "validation": "$context.error.validationErrorString",
    "requestId": "$context.requestId"
  }
}`
}

export const applyStandardGatewayResponses = (
  scope: Construct,
  restApi: IRestApi,
  options: ApplyStandardGatewayResponsesOptions = {}
): void => {
  const debug = options.debug === true

  standardGatewayResponses.forEach((config) => {
    const gatewayResponse = new GatewayResponse(scope, `standardGatewayResponse${config.responseTypeName}`, {
      restApi,
      type: config.responseType,
      statusCode: config.statusCode,
      responseHeaders: gatewayCorsHeaders,
      templates: {
        'application/json': formatMessage(config, debug)
      }
    })

    console.log('Add standard gateway response to API Gateway', config.responseTypeName, gatewayResponse.node.id)
  })
}
