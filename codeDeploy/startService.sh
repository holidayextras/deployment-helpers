#!/bin/bash -e
SERVICE=${APPLICATION_NAME}

if [ ${APPLICATION_NAME} = "themeBlueprint" ] || [ ${APPLICATION_NAME} = "theatreBlueprint" ]; then
  SERVICE="the-wall"
fi

if [ ${APPLICATION_NAME} = "paultons-seo" ] ]; then
  SERVICE="apache2"
fi

file="/etc/init/${SERVICE}.conf"
if [ ! -f "$file" ]; then
  # fall back to the default
  SERVICE="primaryApplication"
fi

echo "Starting ${SERVICE} (${APPLICATION_NAME})"
service $SERVICE start
