#!/bin/bash
# login to allow test-with-postgresql.sh bx commands
echo Login IBM Cloud api=$CF_TARGET_URL org=$CF_ORG space=$CF_SPACE
bx login -a "$CF_TARGET_URL" --apikey "$IAM_API_KEY" -o "$CF_ORG" -s "$CF_SPACE"

npm config delete prefix
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 4.4
npm install
export PATH=$PATH:./node_modules/.bin
./test/test-with-postgresql.sh
