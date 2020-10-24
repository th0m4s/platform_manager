FROM pmng/apache2-php7
# based on phpmyadmin/phpmyadmin

# set recommended PHP.ini settings
# see https://secure.php.net/manual/en/opcache.installation.php
RUN set -ex; \
    \
    { \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=8'; \
        echo 'opcache.max_accelerated_files=4000'; \
        echo 'opcache.revalidate_freq=2'; \
        echo 'opcache.fast_shutdown=1'; \
    } > /etc/php7/conf.d/opcache-recommended.ini; \
    \
    { \
        echo 'session.cookie_httponly = 1'; \
        echo 'session.use_strict_mode = 1'; \
    } > /etc/php7/conf.d/session-strict.ini; \
    \
    { \
        echo 'allow_url_fopen = Off'; \
        echo 'max_execution_time = 600'; \
        echo 'memory_limit = 512M'; \
    } > /etc/php7/conf.d/phpmyadmin-misc.ini

# Calculate download URL
ENV VERSION 5.0.2
ENV SHA256 cbcc78d1499308d9329950fcba2ebaa84c559a934fe54efc027d459d8e4161c8
ENV URL https://files.phpmyadmin.net/phpMyAdmin/${VERSION}/phpMyAdmin-${VERSION}-all-languages.tar.xz

# Download tarball, verify it using gpg and extract
RUN set -ex; \
    apk add --no-cache --virtual .fetch-deps \
        gnupg \
    ; \
    \
    export GNUPGHOME="$(mktemp -d)"; \
    export GPGKEY="3D06A59ECE730EB71B511C17CE752F178259BD92"; \
    curl -fsSL -o phpMyAdmin.tar.xz $URL; \
    curl -fsSL -o phpMyAdmin.tar.xz.asc $URL.asc; \
    echo "$SHA256 *phpMyAdmin.tar.xz" | sha256sum -c -; \
    gpg --batch --keyserver ha.pool.sks-keyservers.net --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver ipv4.pool.sks-keyservers.net --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver keys.gnupg.net --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver pgp.mit.edu --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver keyserver.pgp.com --recv-keys "$GPGKEY"; \
    gpg --batch --verify phpMyAdmin.tar.xz.asc phpMyAdmin.tar.xz; \
    mkdir /var/project/public; \
    tar -xf phpMyAdmin.tar.xz -C /var/project/public --strip-components=1; \
    mkdir -p /var/project/temp; \
    chown 1000:1000 /var/project/temp; \
    gpgconf --kill all; \
    rm -r "$GNUPGHOME" phpMyAdmin.tar.xz phpMyAdmin.tar.xz.asc; \
    rm -rf /var/project/public/setup/ /var/project/public/examples/ /var/project/public/test/ /var/project/public/po/ /var/project/public/composer.json /var/project/public/RELEASE-DATE-$VERSION; \
    sed -i "s@define('CONFIG_DIR'.*@define('CONFIG_DIR', '/var/project/public/');@" /var/project/public/libraries/vendor_config.php; \
    apk del --no-network .fetch-deps

RUN apk add --no-cache mariadb-client

# configuration should be mounted when starting
EXPOSE 33307

COPY --chown=1000:1000 pma_entrypoint.sh /var/start
RUN chmod +x /var/start/pma_entrypoint.sh

ENTRYPOINT /var/start/pma_entrypoint.sh