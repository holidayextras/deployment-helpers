#!/bin/bash -e
SERVICE=${APPLICATION_NAME}

echo "Stopping $SERVICE (${APPLICATION_NAME})"

systemctl stop primaryApplication.service

