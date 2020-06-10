FROM pmng/base

RUN apk update && apk upgrade && apk add \
	apache2 php7-apache2 curl ca-certificates openssl php7 php7-phar php7-json php7-iconv php7-openssl tzdata openntpd

#RUN curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer
# not installing composer because packages already installed

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

RUN cp /usr/bin/php7 /usr/bin/php \
    && rm -f /var/cache/apk/*

RUN sed -i "s/#LoadModule\ rewrite_module/LoadModule\ rewrite_module/" /etc/apache2/httpd.conf \
    && sed -i "s/#LoadModule\ session_module/LoadModule\ session_module/" /etc/apache2/httpd.conf \
    && sed -i "s/#LoadModule\ session_cookie_module/LoadModule\ session_cookie_module/" /etc/apache2/httpd.conf \
    && sed -i "s/#LoadModule\ session_crypto_module/LoadModule\ session_crypto_module/" /etc/apache2/httpd.conf \
    && sed -i "s/#LoadModule\ deflate_module/LoadModule\ deflate_module/" /etc/apache2/httpd.conf \
    && sed -i "s#^DocumentRoot \".*#DocumentRoot \"/var/project/build/public\"#g" /etc/apache2/httpd.conf \
    && sed -i "s#/var/www/localhost/htdocs#/var/project/build/public#" /etc/apache2/httpd.conf \
    && sed -i "s/User apache/User project/" /etc/apache2/httpd.conf \
    && sed -i "s/Group apache/Group project/" /etc/apache2/httpd.conf \
    && printf "\n<Directory \"/var/project/build/public\">\n\tAllowOverride All\n</Directory>\n" >> /etc/apache2/httpd.conf
    
CMD httpd