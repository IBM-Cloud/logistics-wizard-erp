#!/bin/bash
npm config delete prefix
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 6.9.1
npm install
if [ -z ${COVERALLS_REPO_TOKEN} ]; then
  echo No Coveralls token specified, skipping coveralls.io upload

  echo Running DevOps Insights coverage and unit tests
  npm run idra:coverage

  echo Publishing coverage results to DevOps Insights
  npm run idra:publish-coverage

  echo Publishing unit tests to DevOps Insights
  npm run idra:publish-unittest
else
  npm run coverage
fi
