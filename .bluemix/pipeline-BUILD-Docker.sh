#!/bin/bash
export FULL_IMAGE_NAME=${REGISTRY_URL}/${IMAGE_NAME}:latest
echo "Using Docker image ${FULL_IMAGE_NAME}"
docker build -t ${FULL_IMAGE_NAME} .

echo "Preparing archive directory..."
echo "IMAGE_NAME=${FULL_IMAGE_NAME}" > $ARCHIVE_DIR/image.env
cp -R .bluemix lw-erp*.yml $ARCHIVE_DIR
ls -lRa $ARCHIVE_DIR
