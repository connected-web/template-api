# Migration Guide: OIDC -> `cweb.pkg` + Management API

This guide describes how to migrate a Connected Web service repo to the same pattern used here:

- Package and publish with `cweb package pack/publish`
- Deploy through Management API with `cweb package deploy --host remote`
- Authenticate CI using machine credentials (`CWEB_CLIENT_ID` / `CWEB_CLIENT_SECRET`)
- Avoid direct GitHub OIDC deployment paths for template/component rollout

## 1. Prerequisites

- `cweb` CLI installed locally:
  - `npm install -g @connected-web/cweb`
- GitHub admin/maintainer rights for the target repo
- Ability to run `cweb repo bootstrap` with admin credentials

## 2. Bootstrap GitHub Environments and Machine Credentials

Run once per environment from an operator workstation.

### Dev

```bash
cweb login -p dev --interactive
cweb repo bootstrap -p dev --org connected-web --repo <repo-name> --env dev
cweb repo verify -p dev --org connected-web --repo <repo-name> --env dev
```

### Prod

```bash
cweb login -p prod --interactive
cweb repo bootstrap -p prod --org connected-web --repo <repo-name> --env prod
cweb repo verify -p prod --org connected-web --repo <repo-name> --env prod
```

Expected result:

- GitHub environments `dev` and `prod` exist
- Environment secrets exist:
  - `CWEB_CLIENT_ID`
  - `CWEB_CLIENT_SECRET`

## 3. Required GitHub Secrets

### Organization secret (all repos or selected repos)

- `CONNECTED_WEB_PACKAGES_TOKEN`
  - Must have permission to read/install `@connected-web/*` packages from GitHub Packages.

### Environment secrets (`dev`, `prod`)

- `CWEB_CLIENT_ID`
- `CWEB_CLIENT_SECRET`

Use workflow `environment:` so these env-specific secrets are accessible at runtime.

## 4. Workflow Contract

For each pack/publish/deploy workflow job:

- Set environment:
  - `environment: dev` or `environment: prod`
- Provide env vars:
  - `NODE_AUTH_TOKEN: ${{ secrets.CONNECTED_WEB_PACKAGES_TOKEN }}`
  - `CWEB_CLIENT_ID: ${{ secrets.CWEB_CLIENT_ID }}`
  - `CWEB_CLIENT_SECRET: ${{ secrets.CWEB_CLIENT_SECRET }}`
  - `CWEB_CLIENT_TYPE: ${{ secrets.CWEB_CLIENT_TYPE }}`

Use:

```bash
cweb -p "$TARGET_PROFILE" package deploy --host remote ...
```

The workflow should rely on the cweb CLI and platform bootstrap to resolve profiles. Do not write account JSON or cweb state files inside service repository workflows.

## 5. Deploy Config Required by Template API

Remote deploy config schema (current pattern):

- `Subdomain`
- `HostedZoneDomain`
- `IdentityAuthorizerArn`
- `RELEASETAGDEFAULT`
- `PACKAGEVERSIONDEFAULT`

The deployment worker supplies account-specific context such as `HostedZoneId`, target account ID, and the CloudFormation execution role.

## 6. Package and Deploy Commands

```bash
cweb package pack --component template-api --version "$PACKAGE_VERSION"
cweb -p resources package publish --target registry-api --component template-api --version "$PACKAGE_VERSION" --artifact "$PACKAGE_ARTIFACT"
cweb -p "$TARGET_PROFILE" package deploy \
  --host remote \
  --component template-api \
  --version "$PACKAGE_VERSION" \
  --instance-id "$TARGET_INSTANCE_ID" \
  --config "$DEPLOY_CONFIG"
```

Recommended in CI: deploy with `--watch --timeout <seconds>` so the workflow reports the management worker result.

## 7. Release Process Pattern

- **PR flow** (`pr-check.yml`):
  - test
  - pre-release package version
  - deploy to dev instance
  - post-deploy tests
  - publish API client from `/openapi`
- **Pre-release manual flow** (`package-pre-release.yml`):
  - optional deploy toggle
  - custom instance id
- **Release flow** (`package-release.yml`):
  - tag-triggered prod release
  - manual dispatch override for dev/prod

## 8. Converting Another Service Repo

1. Add pack/publish/deploy workflows using the environment/secrets contract above.
2. Ensure service deploy schema accepts injected config such as authorizer ARN, domain, release tag, and package version.
3. Bootstrap repo environments with `cweb repo bootstrap`.
4. Validate with:
   - PR check workflow
   - `cweb repo verify` for dev/prod

## 9. Common Failure Modes

- `403` installing `@connected-web/*` packages:
  - `CONNECTED_WEB_PACKAGES_TOKEN` missing scope/permissions.
- `No machine credentials available`:
  - `CWEB_CLIENT_ID` / `CWEB_CLIENT_SECRET` / `CWEB_CLIENT_TYPE` missing in the job environment.
- `Unknown cweb profile`:
  - The runner or cweb CLI bootstrap cannot resolve the target profile. Fix profile discovery in cweb/platform setup rather than adding account files to the service repo.
- Deploy schema errors (`must NOT have additional properties`):
  - Deploy config contains keys not in CHASM schema.
- Authorizer runtime/permission failures:
  - Wrong/inaccessible `IDENTITY_AUTHORIZER_ARN`, or missing permission wiring in stack.

## 10. Current Repo Status

This repo has already migrated to the `cweb.pkg` + Management API deploy path for CI checks and release workflows, and `validate-oidc.yml` has been removed as deprecated.
