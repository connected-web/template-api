#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ApiStack } from './src/ApiStack'

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

console.log('Account config:', { accountProfile, accountId, accountConfig })

const app = new cdk.App()
const stackName = accountConfig?.stackName ?? (() => { throw new Error('No stack name defined in account config') })()
const stackTemplate = new ApiStack(app, stackName, {
  env: {
    account: CDK_DEFAULT_ACCOUNT ?? '123456789012',
    region: CDK_DEFAULT_REGION ?? 'eu-west-2'
  }
},
{
  subdomain: accountConfig?.subdomain ?? 'template-api',
  hostedZoneDomain: accountConfig.hostedZoneDomain,
  serviceDataBucketName: ['template-api', accountConfig.environment].join('-'),
  identity: accountConfig.identity
})

console.log('Created stack', stackTemplate.stackName)
