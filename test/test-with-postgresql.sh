#!/bin/bash

# create a service just for the test
SERVICE_NAME=lw-erp-tests-`date +"%Y-%m-%d-%H-%M"`-$RANDOM
echo "Creating a new PostgreSQL service named $SERVICE_NAME"

cf create-service elephantsql turtle $SERVICE_NAME

# generate credentials
cf create-service-key $SERVICE_NAME for-test

# grab the credentials - ignoring the first debug logs of cf command
POSTGRES_CREDENTIALS_JSON=`cf service-key $SERVICE_NAME for-test | tail -n+3`

# inject VCAP_SERVICES in the environment, to be picked up by the datasources.local.js
export VCAP_SERVICES='
{
  "elephantsql": [
    {
      "name": "logistics-wizard-erp-db",
      "label": "elephantsql",
      "plan": "turtle",
      "credentials":'$POSTGRES_CREDENTIALS_JSON'
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
export NODE_ENV=test-with-postgresql

# on exit, delete the service key and service
cleanup() {
  cf delete-service-key -f $SERVICE_NAME for-test
  cf delete-service -f $SERVICE_NAME
}
trap cleanup EXIT

# run the test with a larger timeout as the default is way to small for a remote database
mocha -t 300000
