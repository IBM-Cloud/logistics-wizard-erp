#!/bin/bash

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

cf create-service elephantsql turtle ${PREFIX}logistics-wizard-erp-db
if ! cf app $CF_APP; then
  cf push $CF_APP -n $CF_APP -f ${MANIFEST}
else
  OLD_CF_APP=${CF_APP}-OLD-$(date +"%s")
  rollback() {
    set +e
    if cf app $OLD_CF_APP; then
      cf logs $CF_APP --recent
      cf delete $CF_APP -f
      cf rename $OLD_CF_APP $CF_APP
    fi
    exit 1
  }
  set -e
  trap rollback ERR
  cf rename $CF_APP $OLD_CF_APP
  cf push $CF_APP -n $CF_APP -f ${MANIFEST}
  cf delete $OLD_CF_APP -f
fi
