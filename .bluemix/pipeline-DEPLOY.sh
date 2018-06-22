#!/bin/bash
echo 'Login IBM Cloud api=$CF_TARGET_URL org=$CF_ORG space=$CF_SPACE'
bx login -a "$CF_TARGET_URL" --apikey "$IAM_API_KEY" -o "$CF_ORG" -s "$CF_SPACE"

# The branch may use a custom manifest
MANIFEST=manifest.yml
if [ -f ${REPO_BRANCH}-manifest.yml ]; then
  MANIFEST=${REPO_BRANCH}-manifest.yml
fi
echo "Using manifest file: $MANIFEST"

# and a prefix for services if not building the master branch
if [ "$REPO_BRANCH" == "master" ]; then
  echo "No prefix for master branch"
  PREFIX=""
else
  PREFIX=$REPO_BRANCH"-"
  echo "Using prefix: $PREFIX"
fi

bx service create elephantsql turtle ${PREFIX}logistics-wizard-erp-db
if ! bx app show $CF_APP; then
  bx app push $CF_APP -n $CF_APP -f ${MANIFEST}
else
  OLD_CF_APP=${CF_APP}-OLD-$(date +"%s")
  rollback() {
    set +e
    if bx app show $OLD_CF_APP; then
      bx app logs $CF_APP --recent
      bx app delete $CF_APP -f
      bx app rename $OLD_CF_APP $CF_APP
    fi
    exit 1
  }
  set -e
  trap rollback ERR
  bx app rename $CF_APP $OLD_CF_APP
  bx app push $CF_APP -n $CF_APP -f ${MANIFEST}
  bx app delete $OLD_CF_APP -f
fi
