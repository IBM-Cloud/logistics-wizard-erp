#!/bin/bash
echo Login IBM Cloud api=$CF_TARGET_URL org=$CF_ORG space=$CF_SPACE
ibmcloud login -a "$CF_TARGET_URL" --apikey "$IAM_API_KEY" -o "$CF_ORG" -s "$CF_SPACE" -g "$RESOURCE_GROUP"

# The branch may use a custom manifest
MANIFEST=manifest.yml
if [ -f ${REPO_BRANCH}-manifest.yml ]; then
  MANIFEST=${REPO_BRANCH}-manifest.yml
fi
echo "Using manifest file: $MANIFEST"

# and a prefix for dev branch services
if [ "$REPO_BRANCH" == "dev" ]; then
  PREFIX=$REPO_BRANCH"-"
  echo "Using prefix: $PREFIX"
else
  echo "No prefix for non-dev branch"
  PREFIX=""
fi

if [ -z "$CLOUDANT_SERVICE_PLAN" ]; then
  CLOUDANT_SERVICE_PLAN=Lite
fi

ibmcloud cf create-service cloudantNoSQLDB $CLOUDANT_SERVICE_PLAN ${PREFIX}logistics-wizard-erp-db

# create the database
until ibmcloud cf create-service-key ${PREFIX}logistics-wizard-erp-db for-pipeline
do
  echo "Will retry..."
  sleep 10
done

CREDENTIALS_JSON=$(ibmcloud cf service-key ${PREFIX}logistics-wizard-erp-db for-pipeline | tail -n+5)
CLOUDANT_URL=$(echo $CREDENTIALS_JSON | jq -r .url)
curl -s -X PUT $CLOUDANT_URL/logistics-wizard | grep -v file_exists

if ! ibmcloud cf app $CF_APP; then
  ibmcloud cf push $CF_APP -n $CF_APP -f ${MANIFEST}
else
  OLD_CF_APP=${CF_APP}-OLD-$(date +"%s")
  rollback() {
    set +e
    if ibmcloud cf app $OLD_CF_APP; then
      ibmcloud cf logs $CF_APP --recent
      ibmcloud cf delete $CF_APP -f
      ibmcloud cf rename $OLD_CF_APP $CF_APP
    fi
    exit 1
  }
  set -e
  trap rollback ERR
  ibmcloud cf rename $CF_APP $OLD_CF_APP
  ibmcloud cf push $CF_APP -n $CF_APP -f ${MANIFEST}
  ibmcloud cf delete $OLD_CF_APP -f
fi
