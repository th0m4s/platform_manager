FROM pmng/base
# from trafex/alpine-nginx-php7

RUN apk update && apk upgrade && apk add php7 php7-fpm php7-phar php7-json php7-iconv php7-openssl tzdata openntpd nginx supervisor curl && \
    rm /etc/nginx/conf.d/default.conf

RUN apk add \
	php7-ftp \
	php7-xdebug \
	php7-mcrypt \
	php7-mbstring \
	php7-soap \
	php7-gmp \
	php7-pdo_odbc \
	php7-dom \
	php7-pdo \
	php7-zip \
	php7-mysqli \
	php7-sqlite3 \
	php7-pdo_pgsql \
	php7-bcmath \
	php7-gd \
	php7-odbc \
	php7-pdo_mysql \
	php7-pdo_sqlite \
	php7-gettext \
	php7-xml \
	php7-xmlreader \
	php7-xmlwriter \
	php7-tokenizer \
	php7-xmlrpc \
	php7-bz2 \
	php7-pdo_dblib \
	php7-curl \
	php7-ctype \
	php7-session \
	php7-redis \
	php7-exif \
	php7-intl \
	php7-fileinfo \
	php7-ldap \
	php7-apcu

# see apache dockerfile for composer details

# Configure nginx
COPY config/nginx.conf /etc/nginx/nginx.conf

# Configure PHP-FPM
COPY config/fpm-pool.conf /etc/php7/php-fpm.d/www.conf
COPY config/php.ini /etc/php7/conf.d/custom.ini

# Configure supervisord
COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN chown -R 1000:1000 /run && \
  chown -R 1000:1000 /var/lib/nginx && \
  chown -R 1000:1000 /var/log/nginx

RUN mkdir /var/start/
COPY --chown=1000:1000 entrypoint.sh /var/start
RUN chmod +x /var/start/entrypoint.sh

# USER project
# user is set in httpd.conf
ENTRYPOINT /var/start/entrypoint.sh