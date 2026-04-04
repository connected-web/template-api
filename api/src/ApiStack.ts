import * as cdk from 'aws-cdk-lib'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { CnameRecord, HostedZone } from 'aws-cdk-lib/aws-route53'

import { Construct } from 'constructs'
import { OpenAPIRestAPI, OpenAPIBasicModels } from '@connected-web/openapi-rest-api'

import { Resources } from './Resources'
import { StatusEndpoint } from './endpoints/Status/metadata'
import { OpenAPISpecEndpoint } from './endpoints/OpenAPISpec/metadata'

export interface IdentityConfig {
  authorizerArn: string
}

export interface StackParameters {
  subdomain: string
  hostedZoneDomain: string
  hostedZoneId?: string
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
    const hostedZoneIdParameter = new cdk.CfnParameter(this, 'HostedZoneId', {
      type: 'String',
      default: config.hostedZoneId ?? ''
    })
    const identityAuthorizerArnParameter = new cdk.CfnParameter(this, 'IDENTITY_AUTHORIZER_ARN', {
      type: 'String',
      default: config.identity.authorizerArn
    })

    // Create shared resources
    const sharedResources = new Resources(scope, this, config)

    // Disable OpenAPIRestAPI's internal hosted-zone lookup path; we provision custom domain via HostedZoneId.
    process.env.CREATE_CNAME_RECORD = 'false'

    // Create API Gateway
    const apiGateway = new OpenAPIRestAPI<Resources>(this, 'Template API', {
      Description: 'Template API - https://github.com/connected-web/template-api',
      SubDomain: subdomainParameter.valueAsString,
      HostedZoneDomain: hostedZoneDomainParameter.valueAsString,
      AuthorizerARN: identityAuthorizerArnParameter.valueAsString,
      Verifiers: []
    }, sharedResources)

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: hostedZoneIdParameter.valueAsString,
      zoneName: hostedZoneDomainParameter.valueAsString
    })
    const vanityDomain = `${subdomainParameter.valueAsString}.${hostedZoneDomainParameter.valueAsString}`
    const cert = new Certificate(this, 'ApiDomainCertificate', {
      domainName: vanityDomain,
      validation: CertificateValidation.fromDns(hostedZone)
    })
    const domain = apiGateway.restApi.addDomainName('ApiDomainName', {
      domainName: vanityDomain,
      certificate: cert
    })
    const apiCnameRecord = new CnameRecord(this, 'ApiCnameRecord', {
      domainName: domain.domainNameAliasDomainName,
      zone: hostedZone,
      recordName: vanityDomain,
      ttl: cdk.Duration.minutes(5)
    })
    void apiCnameRecord

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
