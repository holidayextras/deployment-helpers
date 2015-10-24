#!/bin/bash -e
SERVICE=${APPLICATION_NAME}

if [ ${APPLICATION_NAME} = "themeBlueprint" ] || [ ${APPLICATION_NAME} = "theatreBlueprint" ]; then
	SERVICE="the-wall"
fi
echo "Stopping $SERVICE"
service $SERVICE stop
