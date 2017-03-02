#!/bin/bash

# ci_get_interesting_commit.sh [target_branch_name]

# Assuming we're in a git repo on a CI worker, this gets the "most likely"
# commit to be relevant when it comes to reporting status back to where the
# code is hosted. It's almost always the commit that's currently checked out,
# the one exception being that some CI services will automatically merge
# your commit into a target branch, creating a temporary commit that only
# the CI service knows about. This script identifies and ignores that case,
# instead outputing the ref containing the changes being tested.

TARGET_BRANCH_REF=`git rev-parse $1`
CURRENT_REF=`git rev-parse HEAD`
MERGE_BASE_OF_CURRENT_REF=`git rev-parse HEAD^`
REF_MERGED_INTO_CURRENT_REF=`git rev-parse HEAD^2`

if [ "$REF_MERGED_INTO_CURRENT_REF" == "" ]; then
  # The current commit is not a merge - we're probably already
  # where we want to be.
  echo $CURRENT_REF;
  exit 0;
fi

if [ "$REF_MERGED_INTO_CURRENT_REF" == "HEAD^2" ]; then
  # The current commit is not a merge - we're probably already
  # where we want to be.
  echo $CURRENT_REF;
  exit 0;
fi

if [ "$REF_MERGED_INTO_CURRENT_REF" == "$TARGET_BRANCH_REF" ]; then
  # The current commit merges the target branch into the development
  # branch - we're probably already where we want to be.
  echo $CURRENT_REF;
  exit 0;
fi

if [ "$MERGE_BASE_OF_CURRENT_REF" == "$TARGET_BRANCH_REF" ]; then
  # The current commit merges the development branch into the target branch.
  # The commit we're probably interested in is the second half of the merge.
  echo $REF_MERGED_INTO_CURRENT_REF;
  exit 0;
fi

echo "Failed to determine which commit we might be interested in." >&2;
echo "You might have supplied an invalid target branch." >&2;
echo "TARGET_BRANCH=$1" >&2;
echo "TARGET_BRANCH_REF=$TARGET_BRANCH_REF" >&2;
echo "CURRENT_REF=$CURRENT_REF" >&2;
echo "MERGE_BASE_OF_CURRENT_REF=$MERGE_BASE_OF_CURRENT_REF" >&2;
echo "REF_MERGED_INTO_CURRENT_REF=$REF_MERGED_INTO_CURRENT_REF" >&2;
exit 1;
