import * as cdk from 'aws-cdk-lib'

import { Construct } from 'constructs'
import { OpenAPIRestAPI, OpenAPIVerifiers, OpenAPIBasicModels } from '@connected-web/openapi-rest-api'

import { Resources } from './Resources'
import { StatusEndpoint } from './endpoints/Status/metadata'
import { OpenAPISpecEndpoint } from './endpoints/OpenAPISpec/metadata'

export interface IdentityConfig {
  userPoolId: string
  userPoolClientId: string
  oauthUrl: string
}

export interface StackParameters {
  subdomain: string
  hostedZoneDomain: string
  identity: IdentityConfig
}

/**
 * ApiStack
 *
 * The main stack for the API. This stack creates the API Gateway, and all of its endpoints.
 *
 * Use this stack as a template for your own API.
 *
 * Create your own endpoints in ./endpoints/ by extending the OpenAPIEndpoint class, and adding them to the API Gateway.
 *
 * Share custom resources by implementing the ./Resources.ts class, which will be passed into your endpoints.
 *
 * Document custom response and request models in ./models/ by extending the OpenAPIBasicModels class, and adding them to the API Gateway.
 *
 * @param scope Construct scope for this construct
 * @param id Unique identifier for this construct
 * @param props StackProps object containing the description, subdomain, hosted zone domain, and verifiers for this API
 *
 * @returns ApiStack
 */
export class ApiStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props: cdk.StackProps, config: StackParameters) {
    super(scope, id, props)

    const subdomainParameter = new cdk.CfnParameter(this, 'Subdomain', {
      type: 'String',
      default: config.subdomain
    })
    const hostedZoneDomainParameter = new cdk.CfnParameter(this, 'HostedZoneDomain', {
      type: 'String',
      default: config.hostedZoneDomain
    })
    const cognitoUserPoolIdParameter = new cdk.CfnParameter(this, 'COGNITO_USER_POOL_ID', {
      type: 'String',
      default: config.identity.userPoolId
    })
    const cognitoUserPoolClientIdParameter = new cdk.CfnParameter(this, 'COGNITO_USER_POOL_CLIENT_ID', {
      type: 'String',
      default: config.identity.userPoolClientId
    })
    const identityOauthUrlParameter = new cdk.CfnParameter(this, 'IDENTITY_OAUTH_URL', {
      type: 'String',
      default: config.identity.oauthUrl
    })

    // Create shared resources
    const sharedResources = new Resources(scope, this, config)

    const verifiers: OpenAPIVerifiers = [{
      name: 'Connected Web Shared',
      userPoolId: cognitoUserPoolIdParameter.valueAsString,
      tokenUse: 'access',
      clientId: cognitoUserPoolClientIdParameter.valueAsString,
      oauthUrl: identityOauthUrlParameter.valueAsString
    }]

    // Create API Gateway
    const apiGateway = new OpenAPIRestAPI<Resources>(this, 'Template API', {
      Description: 'Template API - https://github.com/connected-web/template-api',
      SubDomain: subdomainParameter.valueAsString,
      HostedZoneDomain: hostedZoneDomainParameter.valueAsString,
      Verifiers: verifiers
    }, sharedResources)

    // Kick of dependency injection for shared models and model factory
    OpenAPIBasicModels.setup(this, apiGateway.restApi)

    // Add endpoints to API
    apiGateway
      .addEndpoints({
        'GET /status': new StatusEndpoint(),
        'GET /openapi': new OpenAPISpecEndpoint()
      })
      .report()
  }
}
