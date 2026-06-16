# Template API cweb Deployment Report

## Necessary Changes

The necessary work is the minimum set that makes this template align with the Connected Web package deployment model without carrying obsolete AWS/OIDC responsibilities in the repo.

1. Package and publish only `.cweb.pkg` artifacts
   - CI should build a `template-api` package with `cweb package pack`.
   - CI should publish that package explicitly to `registry-api`.
   - The old direct/default package publish path is not needed for this template.

2. Deploy through the cweb/management-api path
   - CI should request deployments with `cweb package deploy --host remote`.
   - GitHub Actions should not assume AWS roles or run CDK deployments directly.
   - CloudFormation execution belongs to the management-api deployment worker.

3. Remove legacy account and auth paths
   - `.github/workflows/accounts/*` is no longer necessary.
   - Header-only auth deployment support is not necessary for this template generation.
   - OIDC validation/deploy workflow paths are no longer necessary for the package deployment model.

4. Keep deploy config explicit and small
   - The template needs package-level inputs such as `Subdomain`, `HostedZoneDomain`, `IdentityAuthorizerArn`, `RELEASETAGDEFAULT`, and `PACKAGEVERSIONDEFAULT`.
   - Account-specific details such as target account, hosted zone ID, and CloudFormation execution role should come from the deployment platform.
   - If cweb profile discovery fails in CI, that should be fixed in cweb/platform bootstrap, not by writing account config files in this repo.

5. Preserve the API package interface
   - Keep using `@connected-web/openapi-rest-api` for API Gateway route/model/authorizer wiring.
   - Keep `/openapi` and `/status` as the verification surface.
   - Ensure `/status` reports package/release metadata supplied at deploy time.

6. Enforce maintainability limits
   - Workflow YAML files must stay at or below 200 lines.
   - Non-test source files must stay at or below 500 lines.
   - Code lines must stay at or below 250 characters.
   - These limits should be enforced in CI so workflow/scripts do not quietly grow into unreviewable deployment programs.

## Necessary CI Shape

The PR check should:

1. Install dependencies.
2. Run the CDK/API test suite.
3. Pack `template-api` as a `.cweb.pkg`.
4. Publish the package to `registry-api`.
5. Deploy the package to dev through `cweb package deploy --host remote`.
6. Smoke test `/openapi`.
7. Verify `/status.packageVersion` matches the package version deployed by the workflow.

Release deployment should:

1. Use the exact release tag as the package version, after stripping an optional leading `v`.
2. Deploy to dev first.
3. Deploy to prod only after dev succeeds and the release/manual trigger permits prod deployment.
4. Avoid generating RC package versions inside YAML.

## Deliberately Not Necessary

These are not required for the template to work correctly and should not be reintroduced without a specific platform reason:

- Inline scripts that synthesize cweb account config.
- GitHub OIDC role assumption in service repo workflows.
- Direct CDK deploy workflows from this repo.
- Header-only authentication deployment profiles.
- Long YAML scripts for DNS resolution or release-version policy.
- Repo-local account JSON copied from platform state.

## Documentation Boundary

The docs should make this division clear:

- Template API owns the stack, Lambda code, package metadata, and deploy-time parameter contract.
- `registry-api` owns package storage and package version lookup.
- `management-api` owns deployment records, worker execution, status, and AWS-side orchestration.
- The deployment worker owns account context, hosted zone resolution, and CloudFormation execution.

That boundary is the important architectural point of this PR.
