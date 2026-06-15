import { beforeAll, describe, it } from 'vitest'

import * as cdk from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { ApiStack } from '../../ApiStack'

import fs from 'node:fs'

// Avoid writing to step summary during these tests
process.env.GITHUB_STEP_SUMMARY = undefined

const getTemplate = (): Template => {
  const app = new cdk.App()
  const stack = new ApiStack(app, 'MyTestStack', {
    env: {
      account: '1234567890',
      region: 'eu-west-2'
    }
  },
  {
    subdomain: 'test-api',
    hostedZoneDomain: 'dummy.domain.name',
    hostedZoneId: 'Z1234567890',
    identity: {
      authorizerArn: 'arn:aws:lambda:eu-west-2:1234567890:function:TestAuthorizer'
    }
  })
  const template = Template.fromStack(stack)
  fs.writeFileSync('src/tests/template.json', JSON.stringify(template, null, 2))
  return template
}

describe('REST API', () => {
  let template: Template

  beforeAll(() => {
    template = getTemplate()
  }, 30000)

  it('Creates an AWS ApiGateway RestApi with the correct title and description', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Description: 'Template API - https://github.com/connected-web/template-api',
      Name: 'Template API'
    })
  })

  it('Creates a AWS ApiGateway Method with the operationId - getStatus', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      OperationName: 'getStatus'
    })
  })

  it('Creates a AWS ApiGateway Method with the operationId - getOpenAPISpec', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      OperationName: 'getOpenAPISpec'
    })
  })

  it('Creates deploy-time API custom domain resources without hosted zone lookup', () => {
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: {
        'Fn::Join': [
          '',
          [
            {
              Ref: 'Subdomain'
            },
            '.',
            {
              Ref: 'HostedZoneDomain'
            }
          ]
        ]
      },
      ValidationMethod: 'DNS',
      DomainValidationOptions: [
        {
          DomainName: {
            'Fn::Join': [
              '',
              [
                {
                  Ref: 'Subdomain'
                },
                '.',
                {
                  Ref: 'HostedZoneDomain'
                }
              ]
            ]
          },
          HostedZoneId: {
            Ref: 'HostedZoneId'
          }
        }
      ]
    })

    template.hasResourceProperties('AWS::ApiGateway::DomainName', {
      EndpointConfiguration: {
        Types: [
          'REGIONAL'
        ]
      }
    })

    template.hasResourceProperties('AWS::Route53::RecordSet', {
      HostedZoneId: {
        Ref: 'HostedZoneId'
      },
      Type: 'CNAME'
    })
  })

  it('Allows API Gateway to invoke the shared authorizer for this API only', () => {
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      FunctionName: {
        Ref: 'IDENTITYAUTHORIZERARN'
      },
      Principal: 'apigateway.amazonaws.com',
      SourceArn: {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition'
            },
            ':execute-api:eu-west-2:1234567890:',
            Match.anyValue(),
            '/authorizers/*'
          ]
        ]
      }
    })
  })
})
