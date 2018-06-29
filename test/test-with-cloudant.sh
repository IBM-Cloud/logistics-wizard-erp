#!/bin/bash

# create a service just for the test
SERVICE_NAME=lw-erp-tests-`date +"%Y-%m-%d-%H-%M"`-$RANDOM
echo "Creating a new Cloudant service named $SERVICE_NAME"

bx service create cloudantNoSQLDB Lite $SERVICE_NAME

# generate credentials
bx service key-create $SERVICE_NAME for-test

# grab the credentials - ignoring the first debug logs of bx command
CREDENTIALS_JSON=`bx service key-show $SERVICE_NAME for-test | tail -n+5`

# create the database
CLOUDANT_URL=`bx service key-show $SERVICE_NAME for-test | grep "\"url\"" | awk '{print $2}' | tr -d '","'`
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
  bx service key-delete -f $SERVICE_NAME for-test
  bx service delete -f $SERVICE_NAME
}
trap cleanup EXIT

# run the test with a larger timeout as the default is way to small for a remote database
mocha -t 300000
