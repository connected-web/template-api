import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { httpStatusCodes, lambdaResponse } from '../../helpers/Response'

function resolveBuildVersion (): string {
  const explicit = process.env.STATUS_BUILD_VERSION?.trim()
  if (explicit != null && explicit !== '') return explicit
  const githubSha = process.env.GITHUB_SHA?.trim()
  if (githubSha != null && githubSha !== '') return githubSha.slice(0, 8)
  const pkgVersion = process.env.npm_package_version?.trim()
  if (pkgVersion != null && pkgVersion !== '') return pkgVersion
  return 'unknown'
}

/* This handler is executed by AWS Lambda when the endpoint is invoked */
export async function handler (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return lambdaResponse(httpStatusCodes.success, JSON.stringify({
    ok: true,
    service: process.env.ACCOUNT_SERVICE?.trim() ?? 'template-api',
    deploymentTime: process.env.STATUS_DEPLOYMENT_TIME ?? '',
    releaseTag: process.env.RELEASE_TAG?.trim() ?? '',
    packageVersion: process.env.PACKAGE_VERSION?.trim() ?? '',
    buildVersion: resolveBuildVersion()
  }))
}
