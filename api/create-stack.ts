#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ApiStack } from './src/ApiStack'

const {
  ACCOUNT_PROFILE,
  AWS_ACCOUNT_CONFIG,
  AWS_ACCOUNT_ID,
  CDK_DEFAULT_ACCOUNT,
  CDK_DEFAULT_REGION,
  DEPLOY_CONFIG
} = process.env

const accountProfile = ACCOUNT_PROFILE
const raw = AWS_ACCOUNT_CONFIG ?? ''
const parseAccountConfig = (value: string): Record<string, any> => {
  if (value === '') return {}

  const trimmed = value.trim()
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed)
  }

  return JSON.parse(Buffer.from(value, 'base64').toString('utf8'))
}
const accountConfig = parseAccountConfig(raw)
const deployConfig = parseAccountConfig(DEPLOY_CONFIG ?? '')
const mergedConfig: Record<string, any> = {
  ...accountConfig,
  ...deployConfig,
  identity: {
    ...(accountConfig?.identity ?? {}),
    ...(deployConfig?.identity ?? {}),
    authorizerArn:
      deployConfig?.IDENTITY_AUTHORIZER_ARN ??
      deployConfig?.identity?.authorizerArn ??
      accountConfig?.identity?.authorizerArn ??
      ''
  }
}
const accountId = AWS_ACCOUNT_ID

console.log('Account config:', { accountProfile, accountId, accountConfig: mergedConfig })

const app = new cdk.App()
const stackName = mergedConfig?.stackName ?? 'TemplateAPI'
const subdomain = mergedConfig?.subdomain ?? mergedConfig?.Subdomain ?? 'template-api'

const stackTemplate = new ApiStack(app, 'TemplateApiStack', {
  stackName,
  env: {
    account: CDK_DEFAULT_ACCOUNT ?? '123456789012',
    region: CDK_DEFAULT_REGION ?? 'eu-west-2'
  }
},
{
  subdomain,
  hostedZoneDomain: mergedConfig.hostedZoneDomain ?? mergedConfig.HostedZoneDomain ?? 'dev.connected-web.services',
  identity: {
    authorizerArn: mergedConfig?.identity?.authorizerArn ?? ''
  }
})

console.log('Created stack', stackTemplate.stackName)
