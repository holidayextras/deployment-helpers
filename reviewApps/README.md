# Review App helpers

### `ci_get_interesting_commit.sh`

```
ci_get_interesting_commit.sh [target_branch_name]
```

Works out which commit is being built, discarding commits resulting from the CI worker merging the branch being built into a target branch.

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
