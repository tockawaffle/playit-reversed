# Local Workflow Testing Guide

This guide shows how to test GitHub Actions workflows locally before pushing to GitHub.

## Prerequisites

1. **Docker Desktop** must be installed and running
   - Download from: https://www.docker.com/products/docker-desktop

2. **act** CLI tool
   - Install with Chocolatey: `choco install act-cli`
   - Install with Scoop: `scoop install act`
   - Or download from: https://github.com/nektos/act

## Setup

### 1. Create Secrets File

Create a file at `.github/workflows/.env.secrets` with your actual secrets:

```bash
# .github/workflows/.env.secrets
PLAYIT_API_KEY=your_playit_session_token_here
NPM_TOKEN=your_npm_token_here
```

**Important**: This file is gitignored and should NEVER be committed!

### 2. Verify Docker is Running

```bash
docker ps
```

If this fails, start Docker Desktop.

## Testing Workflows

### List Available Workflows

```bash
act -l
```

This shows all workflows and jobs.

### Test Build Workflow

```bash
# Dry run (shows what would happen)
act workflow_dispatch -W .github/workflows/build.yml --dryrun

# Actually run it
act workflow_dispatch -W .github/workflows/build.yml
```

### Test Test Workflow (with secrets)

```bash
# Run the test workflow with secrets
act workflow_dispatch -W .github/workflows/test.yml --secret-file .github/workflows/.env.secrets
```

### Test Publish Workflow (with all secrets)

```bash
# Test the entire publish pipeline
act workflow_dispatch -W .github/workflows/publish.yml --secret-file .github/workflows/.env.secrets --input npm_tag=beta
```

### Test Specific Job

```bash
# Test only the build job from publish workflow
act workflow_dispatch -W .github/workflows/publish.yml -j build

# Test only the test job (requires secrets)
act workflow_dispatch -W .github/workflows/publish.yml -j test --secret-file .github/workflows/.env.secrets
```

### Test Push Events

```bash
# Simulate a push to main branch
act push -W .github/workflows/build.yml

# Test all workflows that trigger on push
act push
```

### Test Pull Request Events

```bash
# Simulate a pull request
act pull_request -W .github/workflows/build.yml
```

## Common Commands

```bash
# List all jobs
act -l

# Run with verbose logging
act workflow_dispatch -W .github/workflows/build.yml -v

# Run specific job
act workflow_dispatch -W .github/workflows/test.yml -j test

# Run without pulling latest Docker images
act workflow_dispatch -W .github/workflows/build.yml --pull=false

# Clean up containers after run
act workflow_dispatch -W .github/workflows/build.yml --rm
```

## Quick Test Commands

Here are ready-to-use commands for testing each workflow:

### Build Workflow
```bash
act workflow_dispatch -W .github/workflows/build.yml
```

### Test Workflow
```bash
act workflow_dispatch -W .github/workflows/test.yml --secret-file .github/workflows/.env.secrets
```

### Publish Workflow (Full Pipeline)
```bash
act workflow_dispatch -W .github/workflows/publish.yml --secret-file .github/workflows/.env.secrets --input npm_tag=beta
```

## Troubleshooting

### Docker Issues

**Error: Cannot connect to Docker daemon**
- Make sure Docker Desktop is running
- On Windows, ensure Docker is set to Linux containers mode

### Secrets Not Working

**Error: PLAYIT_API_KEY secret is not set**
- Check `.github/workflows/.env.secrets` exists
- Verify the file has correct format (KEY=value, no quotes)
- Make sure you're using `--secret-file` flag

### Performance Issues

**Workflows run slowly**
- First run downloads Docker images (can take 5-10 minutes)
- Subsequent runs are much faster
- Use `--pull=false` to skip image updates

### Out of Disk Space

**Error: No space left on device**
- Clean up Docker: `docker system prune -a`
- Remove old act containers: `docker ps -a | grep act | awk '{print $1}' | xargs docker rm`

## Limitations

Some things won't work exactly like GitHub Actions:

1. **Artifact upload/download**: Works but uses local directories
2. **Matrix builds**: Supported but slower locally
3. **GitHub API integrations**: May have auth issues
4. **Resource limits**: Uses your local machine resources
5. **Hosted runners**: Uses Docker containers instead

## Tips

1. **Start small**: Test build workflow first, then add complexity
2. **Use dry run**: Always try `--dryrun` first to see what will happen
3. **Check secrets**: Verify secrets are loaded correctly with `-v` flag
4. **Clean up**: Use `--rm` flag to auto-remove containers
5. **Cache Docker images**: Keep common images to speed up testing

## Configuration

The `.actrc` file in the project root contains act configuration:

```
-P ubuntu-latest=catthehacker/ubuntu:act-latest
```

This uses a better Ubuntu image that's more compatible with GitHub Actions.

## Real vs Local Testing

| Feature   | act (Local)            | GitHub Actions      |
| --------- | ---------------------- | ------------------- |
| Speed     | Fast (after first run) | Slower (cold start) |
| Cost      | Free                   | Free (with limits)  |
| Secrets   | Local file             | GitHub UI           |
| Artifacts | Local directories      | GitHub storage      |
| Debugging | Easy (local logs)      | Harder (remote)     |
| Accuracy  | ~95% compatible        | 100% real           |

## Best Practice Workflow

1. Write/modify workflow
2. Test locally with `act --dryrun`
3. Run locally with `act`
4. If successful, commit and push
5. Verify on GitHub Actions
6. Monitor first real run closely

## Further Reading

- act documentation: https://github.com/nektos/act
- GitHub Actions syntax: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions
- Docker documentation: https://docs.docker.com/
