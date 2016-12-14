#!/bin/bash
# Use prefix when needed for DEV environment
if [ "$LOGISTICS_WIZARD_ENV" == "DEV" ]; then
  echo "No prefix for master branch"
  PREFIX="dev-"
  echo "Using prefix: $PREFIX"
else
  PREFIX=""
fi

cf create-service elephantsql turtle ${PREFIX}logistics-wizard-erp-db
if ! cf app $CF_APP; then
  cf push $CF_APP -n $CF_APP -f ${PREFIX}manifest.yml --no-start
  cf set-env $CF_APP LOGISTICS_WIZARD_ENV ${LOGISTICS_WIZARD_ENV}
  cf start $CF_APP
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
  cf push $CF_APP -n $CF_APP -f ${PREFIX}manifest.yml --no-start
  cf set-env $CF_APP LOGISTICS_WIZARD_ENV ${LOGISTICS_WIZARD_ENV}
  cf start $CF_APP
  cf delete $OLD_CF_APP -f
fi
