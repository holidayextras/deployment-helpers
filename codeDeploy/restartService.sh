#!/bin/bash -e
SERVICE=${APPLICATION_NAME}

if [ ${APPLICATION_NAME} = "themeBlueprint" ] || [ ${APPLICATION_NAME} = "theatreBlueprint" ]; then
  SERVICE="the-wall"
fi

file="/etc/init/${SERVICE}.conf"
if [ ! -f "$file" ]; then
  # fall back to the default
  SERVICE="primaryApplication"
fi

echo "Restarting ${SERVICE} (${APPLICATION_NAME})"
service $SERVICE restart
