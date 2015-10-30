echo "counters.${APPLICATION_NAME}.${DEPLOYMENT_GROUP_NAME,,}.inf.deployment 1|c"
echo "counters.${APPLICATION_NAME}.${DEPLOYMENT_GROUP_NAME,,}.inf.deployment 1|c" | nc -u -w0 127.0.0.1 8125