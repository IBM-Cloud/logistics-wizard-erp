#!/bin/bash
export FULL_IMAGE_NAME=${REGISTRY_URL}/${IMAGE_NAME}:latest
echo "Using Docker image ${FULL_IMAGE_NAME}"
docker build -t ${FULL_IMAGE_NAME} .
