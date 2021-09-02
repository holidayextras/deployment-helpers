#!/bin/bash -e
SERVICE=${APPLICATION_NAME}

echo "Restarting ${SERVICE} (${APPLICATION_NAME})"

systemctl start primaryApplication.service

