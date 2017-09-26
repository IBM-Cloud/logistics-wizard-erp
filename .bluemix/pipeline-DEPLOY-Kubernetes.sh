#!/bin/bash

if [ -f "image.env" ]; then
  echo 'Loading image name from image.env file.'
  source image.env
  echo "IMAGE_NAME=${IMAGE_NAME}"
else
  echo 'IMAGE_NAME not set'
  exit 1;
fi

echo 'Installing dependencies...'
sudo apt-get -qq update 1>/dev/null
sudo apt-get -qq install figlet 1>/dev/null

mkdir /tmp/bin
export PATH="/tmp/bin:$PATH"

figlet -f small 'istioctl'
curl -L https://git.io/getLatestIstio | sh -
(cd istio-* && ln -s $PWD/bin/istioctl /tmp/bin/istioctl)
istioctl version

figlet 'Creating database service'
bx cf create-service elephantsql turtle logistics-wizard-erp-db
bx cf create-service-key logistics-wizard-erp-db for-kube

# grab the credentials - ignoring the first debug logs of cf command
POSTGRES_CREDENTIALS_JSON=`cf service-key logistics-wizard-erp-db for-kube | tail -n+3`

# inject VCAP_SERVICES in the environment, to be picked up by the datasources.local.js
VCAP_SERVICES='
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
kubectl delete secret lw-erp-env
kubectl create secret generic lw-erp-env --from-literal=VCAP_SERVICES="${VCAP_SERVICES}"

echo "Using Docker image $IMAGE_NAME"
ESCAPED_IMAGE_NAME=$(echo $IMAGE_NAME | sed 's/\//\\\//g')
cat lw-erp-deployment.yml | sed 's/registry.ng.bluemix.net\/<namespace>\/lw-erp:latest/'$ESCAPED_IMAGE_NAME'/g' > tmp-deployment.yml

echo -e 'Deploying service...'
istioctl delete -f lw-erp-routes.yml
istioctl create -f lw-erp-routes.yml
kubectl apply -f <(istioctl kube-inject -f tmp-deployment.yml --includeIPRanges=172.30.0.0/16,172.20.0.0/16,10.0.0.1/24)
