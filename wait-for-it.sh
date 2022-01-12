#!/bin/sh
# wait-for-it.sh
set -e
  
host="$1"
shift
cmd="$@"
  
until nc -z  $host; do
  >&2 echo "elastic is unavailable - sleeping"
  sleep 1
done
  
>&2 echo "elastic is up - executing command"
exec $cmd