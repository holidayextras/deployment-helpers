#!/bin/bash -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo $0 is deprecated please update to createPrivateRelease.sh instead
pwd
${DIR}/createPrivateRelease.sh $1 $2
exit 0
