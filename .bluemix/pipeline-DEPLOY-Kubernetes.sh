#!/bin/bash

echo 'Installing dependencies...'
sudo apt-get -qq update 1>/dev/null
sudo apt-get -qq install jq 1>/dev/null
sudo apt-get -qq install figlet 1>/dev/null

figlet -f small 'Bluemix CLI'
wget --quiet --output-document=/tmp/Bluemix_CLI_amd64.tar.gz  http://public.dhe.ibm.com/cloud/bluemix/cli/bluemix-cli/latest/Bluemix_CLI_amd64.tar.gz
tar -xf /tmp/Bluemix_CLI_amd64.tar.gz --directory=/tmp

# Create bx alias
echo "#!/bin/sh" >/tmp/Bluemix_CLI/bin/bx
echo "/tmp/Bluemix_CLI/bin/bluemix \"\$@\" " >>/tmp/Bluemix_CLI/bin/bx
chmod +x /tmp/Bluemix_CLI/bin/*

export PATH="/tmp/Bluemix_CLI/bin:$PATH"

figlet -f small 'Container Service'
bx plugin install container-service -r Bluemix

figlet -f small 'kubectl'
wget --quiet --output-document=/tmp/Bluemix_CLI/bin/kubectl  https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
chmod +x /tmp/Bluemix_CLI/bin/kubectl

figlet -f small 'istioctl'
curl -L https://git.io/getIstio | sh -
(cd istio-* && ln -s $PWD/bin/istioctl /tmp/Bluemix_CLI/bin/istioctl)

figlet 'Logging in Bluemix'
bx login -a "$CF_TARGET_URL" --apikey "$BLUEMIX_API_KEY" -o "$CF_ORG" -s "$CF_SPACE"
bx cs init

figlet 'ERP Deployment'
echo -e 'Setting KUBECONFIG...'
exp=$(bx cs cluster-config $CLUSTER_NAME | grep export)
eval "$exp"

kubectl version
istioctl version

echo "Using Docker image $IMAGE_NAME"
ESCAPED_IMAGE_NAME=$(echo $IMAGE_NAME | sed 's/\//\\\//g')
cat erp-deployment.yml | sed 's/registry.ng.bluemix.net\/<namespace>\/lw-erp:latest/'$ESCAPED_IMAGE_NAME'/g' > tmp-deployment.yml

echo -e 'Deploying service...'
istioctl delete -f lw-erp-routes.yml
istioctl create -f lw-erp-routes.yml
kubectl apply -f tmp-deployment.yml
