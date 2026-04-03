#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ApiStack } from './src/ApiStack'
import { OpenAPIVerifiers } from '@connected-web/openapi-rest-api'

const {
  ACCOUNT_PROFILE,
  AWS_ACCOUNT_CONFIG,
  AWS_ACCOUNT_ID,
  CDK_DEFAULT_ACCOUNT,
  CDK_DEFAULT_REGION
} = process.env

const accountProfile = ACCOUNT_PROFILE
const raw = AWS_ACCOUNT_CONFIG ?? ''
const accountConfig = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
const accountId = AWS_ACCOUNT_ID

function resolveSharedVerifiers (): OpenAPIVerifiers {
  const verifiers = accountConfig?.identity?.verifiers
  if (Array.isArray(verifiers) && verifiers.length > 0) {
    return verifiers as OpenAPIVerifiers
  }
  throw new Error('No shared identity verifiers configured. This stack requires Cognito shared authorizer verifiers.')
}

console.log('Account config:', { accountProfile, accountId, accountConfig })

const app = new cdk.App()
const stackName = accountConfig?.stackName ?? (() => { throw new Error('No stack name defined in account config') })()
const subdomain = accountConfig?.subdomain ?? 'template-api'

const stackTemplate = new ApiStack(app, 'TemplateApiStack', {
  stackName,
  env: {
    account: CDK_DEFAULT_ACCOUNT ?? '123456789012',
    region: CDK_DEFAULT_REGION ?? 'eu-west-2'
  }
},
{
  subdomain,
  hostedZoneDomain: accountConfig.hostedZoneDomain,
  identity: {
    verifiers: resolveSharedVerifiers()
  }
})

console.log('Created stack', stackTemplate.stackName)
