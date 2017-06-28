#!/bin/bash
export FULL_IMAGE_NAME=${REGISTRY_URL}/lw-erp:latest
echo "Using Docker image ${FULL_IMAGE_NAME}"
docker build -t ${FULL_IMAGE_NAME} .

echo "Adding image.env to archive directory..."
echo "IMAGE_NAME=${FULL_IMAGE_NAME}" > $ARCHIVE_DIR/image.env
