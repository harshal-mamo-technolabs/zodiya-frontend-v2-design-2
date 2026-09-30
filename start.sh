#!/bin/bash

composer install --working-dir=/var/www/html

chown -R nginx:nginx /logs
chmod -R 777 /logs

# Ensure PHP-FPM socket directory exists and has proper permissions
mkdir -p /var/run/php
chown -R nginx:nginx /var/run/php
chmod -R 755 /var/run/php

exec /usr/bin/supervisord -n -c /etc/supervisord.conf
