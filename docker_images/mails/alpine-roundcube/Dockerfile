FROM pmng/apache2-php7
# based on phpmyadmin/phpmyadmin

# set default php.ini settings
COPY roundcube-defaults.ini /etc/php7/conf.d/roundcube-defaults.ini


# Calculate download URL
ENV VERSION 1.4.9
ENV URL https://github.com/roundcube/roundcubemail/releases/download/${VERSION}/roundcubemail-${VERSION}-complete.tar.gz

RUN set -ex; apk add --no-cache coreutils

# Download tarball, verify it using gpg and extract
RUN set -ex; \
    apk add --no-cache --virtual .fetch-deps \
        gnupg mariadb-client \
    ; \
    \
    export GNUPGHOME="$(mktemp -d)"; \
    export GPGKEY="F3E4C04BB3DB5D4215C45F7F5AB2BAA141C4F7D5"; \
    curl -fsSL -o roundcube.tar.gz $URL; \
    curl -fsSL -o roundcube.tar.gz.asc $URL.asc; \
    gpg --batch --keyserver ha.pool.sks-keyservers.net --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver ipv4.pool.sks-keyservers.net --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver keys.gnupg.net --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver pgp.mit.edu --recv-keys "$GPGKEY" \
        || gpg --batch --keyserver keyserver.pgp.com --recv-keys "$GPGKEY"; \
    gpg --batch --verify roundcube.tar.gz.asc roundcube.tar.gz; \
    mkdir /var/project/public; \
    tar -xzf roundcube.tar.gz -C /var/project/public --strip-components=1; \
    mkdir -p /var/project/temp; \
    chown 1000:1000 /var/project/temp; \
    gpgconf --kill all; \
    rm -r "$GNUPGHOME" roundcube.tar.gz roundcube.tar.gz.asc; \
    rm -rf /var/project/public/installer/ /var/project/public/INSTALL /var/project/public/README.md /var/project/public/UPGRADING /var/project/public/composer.json /var/project/public/composer.json-dist /var/project/public/CHANGELOG \
    apk del .fetch-deps

COPY --chown=1000:1000 install_plugin.sh /var/start
RUN chmod +x /var/start/install_plugin.sh;

RUN /var/start/install_plugin.sh contextmenu johndoh/roundcube-contextmenu 3.2
RUN /var/start/install_plugin.sh logoutredirect marneu/logout_redirect master

# configuration should be mounted when starting
EXPOSE 8025

COPY --chown=1000:1000 rc_entrypoint.sh /var/start
RUN chmod +x /var/start/rc_entrypoint.sh && \
    chown -R 1000:1000 /var/project

ENTRYPOINT /var/start/rc_entrypoint.sh