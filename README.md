# Template API

A template for building highly scalable serverless APIs using AWS Lambda, API Gateway, Route53, and ACM.

## Features

- 🌐 AWS API Gateway REST API
- 🚀 Individual AWS Lambda endpoints in TypeScript
- 📖 OpenAPI 3.0 spec generated from the deployed API
- 🔒 Custom domain with Route53 and ACM
- 🔑 Shared Connected Web API authorizer
- 🔐 Connected Web `.cweb.pkg` package deployment through `registry-api` and `management-api`


## Deployment Summary

Template API - https://github.com/connected-web/template-api

Registered URL: https://template-api.dev.connected-web.services

## CI Deploy Model

Pull requests package `template-api` as a `.cweb.pkg`, publish only that package artifact to `registry-api`, and deploy the package to dev with `cweb package deploy --host remote`. GitHub release and prerelease events follow the same package-first flow, deploying to dev before prod.

GitHub Actions do not assume AWS roles directly and do not carry account JSON. The workflow uses cweb machine credentials to publish to `registry-api` and request a remote deployment. The management API deployment worker owns the AWS-side execution: account context, hosted-zone lookup, CloudFormation execution role, and stack create/update.

The template owns the CloudFormation it emits. Connected Web supplies platform-owned deployment parameters such as subdomain, hosted-zone domain, shared identity authorizer ARN, release tag, and package version from the deployment instance, package metadata, and target environment.

### Endpoints

| Operation ID | HTTP Method | Path |
| --- | --- | --- |
| getStatus | GET | /status |
| getOpenAPISpec | GET | /openapi |

## Contributing

The API Template project is open for contributions. Please refer to the [Contributing Guidelines](CONTRIBUTING.md) for more information.

## License Information

This project is licensed under the ISC License. See the [LICENSE](LICENSE.md) file for more information.
