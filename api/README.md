# API Stack

This is a AWS CDK stack definition.

It is designed as simple, extremely cheap to host, but highly scalable API that can be used as a starting point for building your own API.

## Features

- 🌐 AWS API Gateway
- 🚀 Individual AWS Lambda endpoints (TypeScript)
- 📖 Self-documented with OpenAPI 3.0 spec generated by the API Gateway itself
- 🔒 Custom Hosted Zone with SSL certificate
- 🔑 SSO Authorization using AWS Cognito as a shared Auth service
- 🔐 Deployed via Github Actions using preconfigured OIDC relationship

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)

### Setup

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm test` to run the tests
4. Run `npm run lint` to fix any linting issues

### Deployment

We recommend using [Github Actions](../.github/workflows/deploy-cdk-api.yml) to deploy this stack.

This assumes you have already established a trust relationship between your Github account and your AWS account; or have created appropriate IAM credentials for the Github Action to use.

### Environments

This stack is designed to be deployed to multiple environments. The following environments are supported:

- `connected-web-dev` - Development environment
- `connected-web-prod` - Production environment

These environments are preconfigured with a Hosted Zone and SSL certificate and AWS Cognito user pools.

### Authentication

This stack uses AWS Cognito as a shared authentication service. The environment config have a section for `identity` containing a list of `verifiers` that are used to verify a standard JWT token passed in the `Authorization` header. The `verifiers` are used in order, and the first one to successfully verify the token will be used. For post-deployment tests the use of a preconfigured App Client ID and Client Secret is recommended to connect to the API.
