import { Construct } from 'constructs'
import path from 'path'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import { MethodResponse } from 'aws-cdk-lib/aws-apigateway'

import { OpenAPIRouteMetadata } from '@connected-web/openapi-rest-api'
import { Resources } from '../../Resources'
import { ApiResponse } from '../../models/ApiResponse'

/* This section is for route metadata used by CDK to create the stack that will host your endpoint */
export class StatusEndpoint extends OpenAPIRouteMetadata<Resources> {
  grantPermissions (scope: Construct, endpoint: NodejsFunction, resources: Resources): void {
    resources.serviceBucket.grantRead(endpoint)
    endpoint.addEnvironment('RELEASE_TAG', resources.releaseTag.valueAsString)
    endpoint.addEnvironment('PACKAGE_VERSION', resources.packageVersion.valueAsString)
  }

  get operationId (): string {
    return 'getStatus'
  }

  get restSignature (): string {
    return 'GET /status'
  }

  get routeEntryPoint (): string {
    return path.join(__dirname, 'handler.ts')
  }

  get lambdaConfig (): NodejsFunctionProps {
    const buildVersion = process.env.STATUS_BUILD_VERSION ?? process.env.GITHUB_SHA?.slice(0, 8) ?? process.env.npm_package_version ?? 'unknown'
    return {
      environment: {
        STATUS_DEPLOYMENT_TIME: process.env.STATUS_DEPLOYMENT_TIME ?? process.env.USE_MOCK_TIME ?? new Date().toISOString(),
        STATUS_BUILD_VERSION: buildVersion
      }
    }
  }

  get methodResponses (): MethodResponse[] {
    return [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Content-Type': true,
        'method.response.header.Access-Control-Allow-Origin': true,
        'method.response.header.Access-Control-Allow-Credentials': true
      },
      responseModels: {
        'application/json': ApiResponse.model
      }
    }]
  }
}
