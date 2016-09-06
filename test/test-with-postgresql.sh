#!/bin/bash

# create a service just for the test
cf create-service elephantsql turtle logistics-wizard-erp-db-for-tests

# generate credentials
cf create-service-key logistics-wizard-erp-db-for-tests for-test

# grab the credentials - ignoring the first debug logs of cf command
POSTGRES_CREDENTIALS_JSON=`cf service-key logistics-wizard-erp-db-for-tests for-test | tail -n+3`

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
  ],
  "service_discovery": [
    {
      "credentials": {
        "auth_token": "123456",
        "url": "https://fake.url.local"
      }
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
  cf delete-service-key -f logistics-wizard-erp-db-for-tests for-test
  cf delete-service -f logistics-wizard-erp-db-for-tests
}
trap cleanup EXIT

# run the test with a larger timeout as the default is way to small for a remote database
mocha -t 300000 test/*.js