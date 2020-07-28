# release-it Github Action
![Tests](https://github.com/TheRealWaldo/release-it/workflows/Tests/badge.svg)

Github Action to leverage release-it in Github repositories.  Must be used with actions/checkout@v2 or above.

Usage of plugins for release-it requires them to be installed in your workspace before hand.

See [release-it/release-it](https://github.com/release-it/release-it) for details on how release-it itself works.

## Inputs

### `github-token`

The Github token to pass to release-it.

Defaults to `${{ github.token }}`.

### `json-opts`

Adds additional options to the release-it command as a serialized Json object.  For example, `'{"dry-run": true}'`.

Defaults to `{}`.

### `git-user-name`

Set the git user name to use when release-it commits.

Defaults to `release-it bump`.

### `git-user-email`

Set the git email address to use when release-it commits.

Defaults to `env.GITHUB_EMAIL`.

### `create-branch`

Name of branch to create before pushing.  If not set, or empty, does not create a branch.

Useful if target branch is secured or locked from direct pushes.

## Outputs

### `json-result`

Serialized Json return object from release-it.

Example:
```
{
  name: 'gh-action-release-it',
  changelog: undefined,
  latestVersion: '0.990.3',
  version: '0.990.4'
}
```

## Example Usage

```
- name: Checkout
  uses: actions/checkout@v2.3.1
  with:
    fetch-depth: 0

- name: release-it
  uses: TheRealWaldo/release-it@v0.0.3
  with:
    json-opts: '{"dry-run": true}'
```
