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

if [ ${SERVICE} = "paultons-seo" ]; then
  SERVICE="apache2"
  if service --status-all | grep -Fq $SERVICE; then
    echo "Restarting ${SERVICE} (${APPLICATION_NAME})"
    service $SERVICE start  	
  fi
else
    echo "Restarting ${SERVICE} (${APPLICATION_NAME})"
    service $SERVICE start  		
fi
