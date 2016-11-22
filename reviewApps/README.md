# Review App helpers

## What this might look like

Configure the CI worker to export a Github access token with the relevant permissions as `GITHUB_TOKEN`. Then your build script could look like...

```
# 1. Find commit ref
COMMIT_HASH=$TRAVIS_COMMIT
# (or)
COMMIT_HASH=$CIRCLE_SHA1
# (or)
COMMIT_HASH=`ci_get_interesting_commit.sh master`

# 2. Request deployment
DEPLOYMENT_ID=`request_github_deployment.sh $GITHUB_TOKEN holidayextras/project-name $COMMIT_HASH pr-deployment-$TRAVIS_PULL_REQUEST`

# 3. (Project-specific bit to deploy your code somewhere goes here)
DEPLOYMENT_URL="http://pr-deployment-$TRAVIS_PULL_REQUEST.your-infrastructure.com"
deploy_my_code_to_this_url.sh $DEPLOYMENT_URL

# 4. Confirm deployment
confirm_github_deployment.sh $GITHUB_TOKEN holidayextras/project-name $DEPLOYMENT_ID $DEPLOYMENT_URL
```

### `request_github_deployment.sh`

```
request_github_deployment.sh [api_token] [project_name] [commit_hash] [environment_name]
```

Tells github that the code being built is about to be deployed to a temporary environment. Outputs the deployment ID, which you'll need to confirm which URL the deployment is accessible through. `project_name` includes the owner, for example `holidayextras/deployment-helpers`. It's recommended that `environment_name` uses the pull request number, so that future commits to the branch supersede previous deployments.

### `confirm_github_deployment.sh`

```
confirm_github_deployment.sh [api_token] [project_name] [deployment_id] [url]
```

Confirms the deployment, providing the "view deployment" button on the pull request. `project_name` includes the owner, for example `holidayextras/deployment-helpers`. `deployment_id` you'll need to provide from the previous command. `url` is where the view deployment button should link to.

### `ci_get_interesting_commit.sh`

```
ci_get_interesting_commit.sh [target_branch_name]
```

**You may not need this** depending on CI worker behaviour - the commit ref on Travis and Circle is already be exported to an environment variable. It's only needed if the CI worker creates a temporary commit with the tested branch merged into the target branch, and `git rev-parse HEAD` does not give back a reference Github knows about.
