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
- Repo includes account config files under:
  - `.github/workflows/accounts/*.json`

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
  - `CWEB_ACCOUNTS_DIR: ${{ github.workspace }}/.github/workflows/accounts`

Use:

```bash
cweb configure -p "$TARGET_PROFILE" --write-github-env
cweb login -p "$TARGET_PROFILE" --user-pool-id "$USER_POOL_ID" --get-access-token --machine > /dev/null
```

`cweb configure` exports environment variables (including `USER_POOL_ID`, `AWS_ACCOUNT_CONFIG`, `IDENTITY_AUTHORIZER_ARN`, `MANAGEMENT_AWS_ACCOUNT_CONFIG`) used to build deploy config.

## 5. Deploy Config Required by Template API

Remote deploy config schema (current pattern):

- `Subdomain`
- `HostedZoneDomain`
- `IDENTITY_AUTHORIZER_ARN`
- Optional: `HostedZoneId`

In this repo, workflows resolve these values from `cweb configure` outputs with fallbacks.

## 6. Package and Deploy Commands

```bash
cweb -p "$TARGET_PROFILE" --user-pool-id "$USER_POOL_ID" package pack --component template-api --version "$PACKAGE_VERSION"
cweb -p "$TARGET_PROFILE" --user-pool-id "$USER_POOL_ID" package publish --component template-api --version "$PACKAGE_VERSION"
cweb -p "$TARGET_PROFILE" --user-pool-id "$USER_POOL_ID" package deploy \
  --host remote \
  --component template-api \
  --version "$PACKAGE_VERSION" \
  --instance-id "$TARGET_INSTANCE_ID" \
  --config "$DEPLOY_CONFIG"
```

Recommended in CI: parse `Item ID` from deploy output and call:

```bash
cweb -p "$TARGET_PROFILE" deployments watch --item-id "$DEPLOY_ITEM_ID"
```

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

1. Add/verify `.github/workflows/accounts/*.json` entries for target accounts.
2. Add pack/publish/deploy workflows using the environment/secrets contract above.
3. Ensure service deploy schema accepts injected config (authorizer ARN/domain), not repo-hardcoded OIDC parameters.
4. Bootstrap repo environments with `cweb repo bootstrap`.
5. Validate with:
   - PR check workflow
   - `cweb repo verify` for dev/prod

## 9. Common Failure Modes

- `403` installing `@connected-web/*` packages:
  - `CONNECTED_WEB_PACKAGES_TOKEN` missing scope/permissions.
- `No machine credentials available`:
  - `CWEB_CLIENT_ID` / `CWEB_CLIENT_SECRET` missing in the job environment.
- `Account config not found for connected-web-dev`:
  - `CWEB_ACCOUNTS_DIR` not set in workflow.
- Deploy schema errors (`must NOT have additional properties`):
  - Deploy config contains keys not in CHASM schema.
- Authorizer runtime/permission failures:
  - Wrong/inaccessible `IDENTITY_AUTHORIZER_ARN`, or missing permission wiring in stack.

## 10. Current Repo Status

This repo has already migrated to the `cweb.pkg` + Management API deploy path for CI checks and release workflows, and `validate-oidc.yml` has been removed as deprecated.
