# 1. The server needs the PHP GMP extension
php -m | grep -i gmp

# 2. Upload the plugin and activate it
git clone https://github.com/DigiByte-Core/digiid-wp-authentication \
  wp-content/plugins/digiid-wp-authentication
wp plugin activate digiid-wp-authentication

# 3. The login screen now shows a Digi-ID QR code.
#    Note: the plugin was last tested with WordPress 4.1.
