#!/bin/bash
npm config delete prefix
nvm install 12.13.0
npm install
if [ -z ${COVERALLS_REPO_TOKEN} ]; then
  echo No Coveralls token specified, skipping coveralls.io upload
  npm run localcoverage
else
  npm run coverage
fi
