# GitHub Actions Workflows Guide

This project uses three GitHub Actions workflows for continuous integration and deployment.

## Workflows Overview

### 1. Build Workflow (`build.yml`)
**Badge**: ![Build](https://github.com/tockawaffle/playit-reversed/actions/workflows/build.yml/badge.svg)

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch
- Manual dispatch (Actions tab)

**What it does**:
1. Checks out the code
2. Sets up Bun
3. Installs dependencies
4. Builds the project (`bun run build`)
5. Uploads build artifacts for use by other workflows

### 2. Test Workflow (`test.yml`)
**Badge**: ![Tests](https://github.com/tockawaffle/playit-reversed/actions/workflows/test.yml/badge.svg)

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch
- Manual dispatch (Actions tab)

**What it does**:
1. Checks out the code
2. Sets up Bun
3. Installs dependencies
4. Validates that `PLAYIT_API_KEY` secret is set
5. Sets up PlayIt environment
6. Runs tests (`bun test`)

**Requirements**: `PLAYIT_API_KEY` secret must be set (see setup below)

### 3. Publish Workflow (`publish.yml`)
**Badge**: ![Publish](https://github.com/tockawaffle/playit-reversed/actions/workflows/publish.yml/badge.svg)

**Triggers**:
- When a GitHub release is published
- Manual dispatch (Actions tab) with NPM tag selection

**What it does**:
1. **Build job**: Builds the project and uploads artifacts
2. **Test job**: Runs all tests (requires `PLAYIT_API_KEY`)
3. **Publish job**: Publishes to NPM (requires `NPM_TOKEN`)

**Flow**: Build → Test → Publish (each step must pass before the next runs)

## Required Secrets Setup

### 1. PLAYIT_API_KEY (for tests)

This is your PlayIt session token needed to run tests.

**Steps to set up**:

1. Get your PlayIt session token:
   - Go to [playit.gg](https://playit.gg) and log in
   - Open DevTools (`F12`) → **Application** → **Cookies**
   - Copy the value of `__session`
   - Remove the `__session=` prefix if present

2. Add to GitHub secrets:
   - Go to your repository on GitHub
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `PLAYIT_API_KEY`
   - Value: Your session token (without `__session=` prefix)
   - Click **Add secret**

### 2. NPM_TOKEN (for publishing)

This is your NPM access token needed to publish packages.

**Steps to set up**:

1. Generate an NPM token:
   - Go to [npmjs.com](https://www.npmjs.com/) and log in
   - Click your profile → **Access Tokens** → **Generate New Token**
   - Select **Automation** token type (for CI/CD)
   - Copy the token

2. Add to GitHub secrets:
   - Go to your repository on GitHub
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: Your NPM token
   - Click **Add secret**

## Manual Workflow Triggers

All workflows support manual triggering:

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select the workflow you want to run
4. Click **Run workflow** button
5. (For Publish workflow) Select the NPM tag (latest, beta, alpha, next)
6. Click **Run workflow**

## Publishing Releases

### Option 1: Automatic (via GitHub Release)

1. Go to your repository → **Releases** → **Create a new release**
2. Create a tag (e.g., `v0.1.0-beta.7.0.0`)
3. Fill in release notes
4. Check **Set as a pre-release** if it's a beta/alpha version
5. Click **Publish release**
6. The publish workflow will automatically:
   - Build the project
   - Run tests
   - Publish to NPM with appropriate tag (beta/alpha/latest)

### Option 2: Manual (via Actions tab)

1. Go to **Actions** → **Publish to NPM**
2. Click **Run workflow**
3. Select the NPM tag:
   - `latest` - for stable releases
   - `beta` - for beta versions (default)
   - `alpha` - for alpha versions
   - `next` - for experimental versions
4. Click **Run workflow**

## NPM Tag Strategy

The publish workflow automatically determines the NPM tag:

- **Manual dispatch**: Uses the tag you select in the dropdown
- **Release publish**: 
  - Contains "beta" → publishes with `beta` tag
  - Contains "alpha" → publishes with `alpha` tag
  - Otherwise → publishes with `latest` tag

## Troubleshooting

### "PLAYIT_API_KEY secret is not set" error
- Make sure you've added the secret as described above
- The secret name must be exactly `PLAYIT_API_KEY`
- Check that the secret value doesn't include `__session=` prefix

### "NPM_TOKEN secret is not set" error
- Make sure you've added the NPM token as described above
- The token must be an **Automation** type token
- Verify the token hasn't expired

### Tests fail in CI but pass locally
- Your local PlayIt session token might be different
- The generated files might not match the CI environment
- Make sure the `PLAYIT_API_KEY` in GitHub secrets is current and valid

### Publish fails with authentication error
- Verify your NPM token is correct and hasn't expired
- Make sure your NPM account has publish permissions for `playit-reversed`
- Check that the package name in `package.json` matches your NPM package

## Workflow Status

You can check the status of all workflows:
- In the **Actions** tab of your repository
- Via the badges in the README
- In pull request checks
