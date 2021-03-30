## Example

```yaml
steps:
  # --%<--
  - name: Update AWS dependencies
    uses: @ukautz/github-action-npm-scope-syncer
    with:
      scopes: "@acme @foobar"
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This is what I use to update AWS CDK libraries and applications and align the package version with `@aws-cdk/core`:

```yaml
steps:
  # --%<--
  - name: Update AWS dependencies
    id: syncer
    uses: @ukautz/github-action-npm-scope-syncer
    with:
      scopes: "aws-cdk @aws-cdk"
      updatePeerDependencies: "true"
      enforcePinning: "true"
      push: true
      versionFromPackage: "@aws-cdk/core"
      versionSuffix: "-alpha1"
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  - name: Publish to Github Packages
    if: steps.syncer.status == "updated"
    uses: actions/setup-node@v2
      with:
        node-version: '14'
        registry-url: 'https://npm.pkg.github.com'
    run: |
      npm install
      npm run build
      npm publish
```

## Environment

Requires `GITHUB_TOKEN` to be set to value of `secrets.GITHUB_TOKEN` so that PRs for failed updates and (optional) releases can be created

## Input Parameters

### `scopes`

Space separated list of package scopes or names that are to be updated

**Required**

### `tagName`

Format of name of the git tag on the commit that create a new the version with the updated scopes. [Input Parameter Variables](#input-parameter-variables) can be used.

**Default**: `%NEW_VERSION%`

### `push`

Whether to push resulting commit and tag

**Allowed**: `0`, `1`, `true`, `false`

**Default**: `0`

### `createRelease`

Whether to create a release

**Allowed**: `0`, `1`, `true`, `false`

**Default**: `0`

### `enforcePinning`

Whether to enforce version pinning for the updated packages of the defined scopes

**Allowed**: `0`, `1`, `true`, `false`

**Default**: `0`

### `updatePeerDependencies`

Whether to update all peer dependency package versions

**Allowed**: `0`, `1`, `true`, `false`

**Default**: `0`

### `successMessage`

Subject of the commit of a successful update. [Input Parameter Variables](#input-parameter-variables) can be used.

**Default**: `Scopes updated, new version %NEW_VERSION% created`

### `failBranch`

Name of failing branch, in case the tests fail after scope updates. [Input Parameter Variables](#input-parameter-variables) can be used.

**Default**: `update-fail/%OLD_VERSION%-to-%NEW_VERSION%-%YMD%`

### `failMessage`

Subject of PR of failed scope update. [Input Parameter Variables](#input-parameter-variables) can be used.

**Default**: `Failed tests for update from %OLD_VERSION% to %NEW_VERSION%`

### `commandInstall`

Command to run install

**Default**: `npm install`

### `commandTest`

Command to run tests

**Default**: `npm run test`

### `commandPublish`

Command to publish package to NPM repository. Is undefined by default. Provide e.g. `npm publish` to execute

### `semver`

SEMVER level that is to be increased for the new package version. Ignored if `versionFromPackage` is set.

**Allowed**: `patch`, `minor`, `major`

**Default**: `minor`

### `versionFromPackage`

Name of the package to get the version from

### `versionPrefix`

Prefix to prepend version with

### `versionSuffix`

Suffix to append version with

## Input Parameter Variables

In some of the above parameters the following variables can be used:

- `%YMD%`: current date in the format `YYYYMMDD` like `20210331`
- `%OLD_VERSION%`: old (current) version of the package
- `%NEW_VERSION%`: new (next) version of the package

## Outputs

### `status`

Contains the success or error state of the execution. Success states are:

- `updated`: Created new version, scopes update yielded later versions
- `up2date`: No need to create a new version, scope updates yielded no `package.json` change
- `found`: Tag that would be created does already exist, no need to run

### `newVersion`

New (next) version of the package

### `oldVersion`

Old (current) version of the package
