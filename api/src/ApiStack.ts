import * as cdk from 'aws-cdk-lib'
import { Certificate, CfnCertificate } from 'aws-cdk-lib/aws-certificatemanager'
import { CfnPermission } from 'aws-cdk-lib/aws-lambda'
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53'

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
    hostedZoneIdParameter.node.addMetadata('cweb:deployConfig', 'HostedZoneId')
    const identityAuthorizerArnParameter = new cdk.CfnParameter(this, 'IdentityAuthorizerArn', {
      type: 'String',
      default: config.identity.authorizerArn
    })

    // Create shared resources
    const sharedResources = new Resources(scope, this, config)

    // Create API Gateway
    const previousCreateCnameRecord = process.env.CREATE_CNAME_RECORD
    process.env.CREATE_CNAME_RECORD = 'false'
    const apiGateway = new OpenAPIRestAPI<Resources>(this, 'Template API', {
      Description: 'Template API - https://github.com/connected-web/template-api',
      SubDomain: subdomainParameter.valueAsString,
      HostedZoneDomain: hostedZoneDomainParameter.valueAsString,
      AuthorizerARN: identityAuthorizerArnParameter.valueAsString,
      Verifiers: []
    }, sharedResources)
    apiGateway.vanityDomain = `${subdomainParameter.valueAsString}.${hostedZoneDomainParameter.valueAsString}`
    if (previousCreateCnameRecord !== undefined) process.env.CREATE_CNAME_RECORD = previousCreateCnameRecord
    else delete process.env.CREATE_CNAME_RECORD

    const vanityDomain = `${subdomainParameter.valueAsString}.${hostedZoneDomainParameter.valueAsString}`
    const certificate = new CfnCertificate(this, 'ApiDomainCertificate', {
      domainName: vanityDomain,
      validationMethod: 'DNS',
      domainValidationOptions: [{
        domainName: vanityDomain,
        hostedZoneId: hostedZoneIdParameter.valueAsString
      }]
    })
    certificate.overrideLogicalId('ApiDomainCertificate0C6AEA7E')

    const domainName = apiGateway.restApi.addDomainName('ApiDomainName', {
      domainName: vanityDomain,
      certificate: Certificate.fromCertificateArn(this, 'ApiDomainCertificateRef', certificate.ref)
    })

    const cnameRecord = new CfnRecordSet(this, 'ApiCnameRecord', {
      hostedZoneId: hostedZoneIdParameter.valueAsString,
      name: `${vanityDomain}.`,
      type: 'CNAME',
      ttl: '300',
      resourceRecords: [domainName.domainNameAliasDomainName]
    })
    cnameRecord.overrideLogicalId('ApiCnameRecord2222559D')

    const authorizerInvokePermission = new CfnPermission(this, 'AllowApiGatewayInvokeSharedAuthorizer', {
      action: 'lambda:InvokeFunction',
      functionName: identityAuthorizerArnParameter.valueAsString,
      principal: 'apigateway.amazonaws.com',
      sourceArn: cdk.Arn.format({
        service: 'execute-api',
        region: cdk.Stack.of(this).region,
        account: cdk.Stack.of(this).account,
        resource: apiGateway.restApi.restApiId,
        resourceName: 'authorizers/*'
      }, this)
    })
    authorizerInvokePermission.node.addDependency(apiGateway.restApi)

    // Kick of dependency injection for shared models and model factory
    OpenAPIBasicModels.setup(this, apiGateway.restApi)

    // Add endpoints to API
    apiGateway
      .addEndpoints({
        'GET /status': new StatusEndpoint(),
        'GET /openapi': new OpenAPISpecEndpoint()
      })
      .report()

    const templateApiUrlOutput = new cdk.CfnOutput(this, 'TemplateApiUrl', {
      value: `https://${vanityDomain}`
    })
    templateApiUrlOutput.node.addDependency(cnameRecord)
  }
}
