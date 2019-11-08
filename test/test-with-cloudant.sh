#!/bin/bash

# create a service just for the test
SERVICE_NAME=lw-erp-tests-`date +"%Y-%m-%d-%H-%M"`-$RANDOM
echo "Creating a new Cloudant service named $SERVICE_NAME"

if [ -z "$CLOUDANT_SERVICE_PLAN" ]; then
  CLOUDANT_SERVICE_PLAN=Lite
fi
ibmcloud cf create-service cloudantNoSQLDB $CLOUDANT_SERVICE_PLAN $SERVICE_NAME

# generate credentials
until ibmcloud cf create-service-key $SERVICE_NAME for-test
do
  echo "Will retry..."
  sleep 10
done

# grab the credentials - ignoring the first debug logs of ibmcloud command
CREDENTIALS_JSON=`ibmcloud cf service-key $SERVICE_NAME for-test | tail -n+5`

# create the database
CLOUDANT_URL=$(echo $CREDENTIALS_JSON | jq -r .url)
curl -s -X PUT $CLOUDANT_URL/logistics-wizard | grep -v file_exists

# inject VCAP_SERVICES in the environment, to be picked up by the datasources.local.js
export VCAP_SERVICES='
{
  "cloudantNoSQLDB": [
    {
      "name": "logistics-wizard-erp-db",
      "label": "cloudantNoSQLDB",
      "plan": "Lite",
      "credentials":'$CREDENTIALS_JSON'
    }
  ]
}'

export VCAP_APPLICATION='
{
  "application_uris": [
    "https://myapp.local"
  ]
}
'

# override NODE_ENV to ensure datasource is not overwritten by unittest.js
export NODE_ENV=test-with-cloudant

# on exit, delete the service key and service
cleanup() {
  ibmcloud cf delete-service-key $SERVICE_NAME for-test -f
  ibmcloud cf delete-service $SERVICE_NAME -f
}
trap cleanup EXIT

# run the test with a larger timeout as the default is way to small for a remote database
mocha -t 3000000
