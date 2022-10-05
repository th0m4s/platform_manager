FROM alpine:3.11

RUN addgroup -S -g 5000 vmail && adduser -h /var/mail -D -G vmail vmail

# nano is useful for debugging and editing files (and dovecot-imapd is included into dovecot - the replacement of dovecot-core)
# are we sure to keep pop3 (if no, don't forget to remove it from configs)?
RUN apk update && apk add --no-cache postfix postfix-mysql dovecot dovecot-pop3d dovecot-lmtpd dovecot-mysql nano bash logrotate && \
    rm -f /var/cache/apk/*

RUN chown -R vmail:dovecot /etc/dovecot && \
    chmod -R o-rwx /etc/dovecot && \
    mkdir /var/mail/vhosts/

RUN mkdir /var/start/
COPY --chown=1000:1000 entrypoint.sh /var/start
RUN chmod +x /var/start/entrypoint.sh

COPY logrotate.d /etc/logrotate.d

ENTRYPOINT /var/start/entrypoint.sh