#!/bin/bash

mkdir /tmp/bin
export PATH="/tmp/bin:$PATH"

curl -L https://git.io/getIstio | sh -
(cd istio-* && ln -s $PWD/bin/istioctl /tmp/bin/istioctl)
istioctl version

istioctl delete -f lw-erp-routes.yml
kubectl delete -f lw-erp-deployment.yml
kubectl delete secret lw-erp-env
