#!/bin/bash -e
SERVICE=${APPLICATION_NAME}

echo "Starting $SERVICE (${APPLICATION_NAME})"

systemctl start primaryApplication.service

