#!/bin/bash
echo Login IBM Cloud api=$CF_TARGET_URL org=$CF_ORG space=$CF_SPACE
ibmcloud login -a "$CF_TARGET_URL" --apikey "$IAM_API_KEY" -o "$CF_ORG" -s "$CF_SPACE" -g "$RESOURCE_GROUP"

npm config delete prefix
nvm install 12.13.0
npm install
export PATH=$PATH:./node_modules/.bin
./test/test-with-cloudant.sh
