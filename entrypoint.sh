#!/bin/bash

set -euo pipefail

# dependencies:
if [ -z $GITHUB_REF ]; then
    echo "Missing environment variable GITHUB_REF"
    exit 1
fi
CODE_BRANCH=${GITHUB_REF#refs/heads/}
CODE_DIR=$(pwd)

# interface:
INPUT_SCOPES=${INPUT_SCOPES:-@undefined}
INPUT_TAGNAME=${INPUT_TAGNAME:-%NEW_VERSION%}
INPUT_PUSH=${INPUT_PUSH:-0}
INPUT_CREATERELEASE=${INPUT_CREATERELEASE:-0}
INPUT_SUCCESSMESSAGE=${INPUT_SUCCESSMESSAGE:-Scopes updated, new version %NEW_VERSION% created}
INPUT_FAILBRANCH=${INPUT_FAILBRANCH:-update-fail/%OLD_VERSION%-to-%NEW_VERSION%-%YMD%}
INPUT_FAILMESSAGE=${INPUT_FAILMESSAGE:-Failed tests for update from %OLD_VERSION% to %NEW_VERSION%}
INPUT_COMMANDINSTALL=${INPUT_COMMANDINSTALL:-npm install}
INPUT_COMMANDTEST=${INPUT_COMMANDTEST:-npm run test}
INPUT_COMMANDPUBLISH=${INPUT_COMMANDPUBLISH:-}
INPUT_DEBUG=${INPUT_DEBUG:-}
export INPUT_VERSIONFROMPACKAGE=${INPUT_VERSIONFROMPACKAGE:-}
export INPUT_VERSIONPREFIX=${INPUT_VERSIONPREFIX:-}
export INPUT_VERSIONSUFFIX=${INPUT_VERSIONSUFFIX:-}
export INPUT_ENFORCEPINNING=${INPUT_ENFORCEPINNING:-false}
export INPUT_UPDATEPEERDEPENDENCIES=${INPUT_UPDATEPEERDEPENDENCIES:-false}
export INPUT_SEMVER=minor
export INPUT_PWD=$CODE_DIR

# TBD: allow list of directories, iterate over them

OUTPUT_STATUS=""
OLD_VERSION="unknown"
NEW_VERSION="unknown"
function output() {
    echo "::set-output name=status::${OUTPUT_STATUS}"
    echo "::set-output name=oldVersion::${OLD_VERSION}"
    echo "::set-output name=newVersion::${NEW_VERSION}"
}
trap output EXIT

function abort() {
    OUTPUT_STATUS="ctrl-c"
    exit 130
}
trap abort INT

# enable debugging?
if [ "$INPUT_DEBUG" == "1" ] || [ "$INPUT_DEBUG" == "true" ]; then
    set -x
fi

# assure: package JSON file available
if [ ! -f package.json ]; then
    echo "Missing package.json file"
    OUTPUT_STATUS="error-missing-package-file"
    exit 1
fi

# set git user
git config --global user.name 'Github Actions'
git config --global user.email "${GITHUB_ACTOR}@users.noreply.github.com"

# determine current version
OLD_VERSION=$(cat package.json | jq '.version' -r)

# run install of (current version) packages
$INPUT_COMMANDINSTALL

# update packages of defined scopes
OUTPUT_STATUS="error-failed-scope-update"
HASH_BEFORE=$(md5sum package.json | awk '{print $1}')
for scope in $(echo "$INPUT_SCOPES" | tr " " "\n" | grep '^@'); do
    npx update-by-scope "$scope" npm install
done
for scope in $(echo "$INPUT_SCOPES" | tr " " "\n" | grep -v '^@'); do
    npm install "${scope}@latest"
done

# determine new (next) package version
OUTPUT_STATUS="error-failed-version-update"
pushd /app
NEW_VERSION=$(bin/version-update.ts)
popd
cat package.json

NOW=$(date +"%Y%m%d")
function template() {
    echo "$@" | sed -e "s/%YMD%/${NOW}/g" -e "s/%OLD_VERSION%/${OLD_VERSION}/g" -e "s/%NEW_VERSION%/${NEW_VERSION}/g"
}

# assure tag not already existing, so no need to re-run
export GIT_TAG=$(template "$INPUT_TAGNAME")
if git tag -l | grep -qe "^${GIT_TAG}\$"; then
    OUTPUT_STATUS="found"
    git checkout package.json package-lock.json
    echo "Tag $GIT_TAG already found, no need to continue"
    exit 0
fi

# fix up dependecies
OUTPUT_STATUS="error-failed-fix-dependencies"
pushd /app
bin/fix-dependencies.ts
popd


# bail out if no changes
HASH_AFTER=$(md5sum package.json | awk '{print $1}')
if [ "$HASH_BEFORE" == "$HASH_AFTER" ]; then
    OUTPUT_STATUS="up2date"
    git checkout package.json package-lock.json
    echo "Package JSON unchanged after scope updates, keeping version ${OLD_VERSION}"
    exit 0
fi
git diff HEAD -- package.json

# run tests 
TEST_OUTPUT=$(mktemp)
template "$INPUT_FAILMESSAGE" > $TEST_OUTPUT
echo -e "\n\n\`\`\`\n" >> $TEST_OUTPUT
set +e
$INPUT_COMMANDTEST |& tee -a $TEST_OUTPUT
TEST_RESULT=${PIPESTATUS[0]}
set -e
echo -e "\n\`\`\`\n\n# end $(date)\n" >> $TEST_OUTPUT

# if test failed -> create PR
if [ $TEST_RESULT -gt 0 ]; then
    OUTPUT_STATUS="error-failed-test-fail-handling"
    # add all to new branch
    FAIL_BRANCH=$(template "$INPUT_FAILBRANCH")
    git checkout -b $FAIL_BRANCH
    git add -A
    git commit --file $TEST_OUTPUT
    git push origin "$FAIL_BRANCH"

    # create PR for branch
    gh pr create --base "$CODE_BRANCH" --head "$FAIL_BRANCH" --label --draft --fill
    OUTPUT_STATUS="error-tests-failed"
    exit 1
fi

# create release message
SUCCESS_OUTPUT=$(mktemp)
template "$INPUT_SUCCESSMESSAGE" > $SUCCESS_OUTPUT
echo -e "\n\n\`\`\`\n" >> $SUCCESS_OUTPUT
git diff $(git ls-files | grep -v package-lock.json) >> $SUCCESS_OUTPUT
echo -e "\n\`\`\`\n\n" >> $SUCCESS_OUTPUT

# commit all changes and tag with version
OUTPUT_STATUS="error-failed-tag-creation"
git add -A
git commit --file $SUCCESS_OUTPUT
git tag "$GIT_TAG"

# push commit and tags
if [ "$INPUT_PUSH" == "1" ] || [ "$INPUT_PUSH" == "true" ]; then
    OUTPUT_STATUS="error-failed-push"
    git push
    git push --tags

    # release
    if [ "$INPUT_CREATERELEASE" == "1" ] || [ "$INPUT_CREATERELEASE" == "true" ]; then
        OUTPUT_STATUS="error-failed-release"
        gh release create "$NEW_VERSION" --title "$GIT_TAG" --notes-file $SUCCESS_OUTPUT --target "$CODE_BRANCH"
    fi
fi

# publish
if [ ! -z $INPUT_COMMANDPUBLISH ]; then
    OUTPUT_STATUS="error-failed-package-publish"
    $INPUT_COMMANDPUBLISH
fi

OUTPUT_STATUS="updated"
