<?php

$config = array();

$config['db_dsnw'] = 'mysql://__DBUSER:__DBPASS@unix(__DBSOCKET)/__DBNAME';

$config['default_host'] = (__enableSSL ? "ssl://" : "").'mail.__ROOT_DOMAIN';
$config['default_port'] = __enableSSL ? 993 : 143;
$config['smtp_server'] = (__enableSSL ? "tls://" : "").'mail.__ROOT_DOMAIN';
$config['smtp_port'] = __enableSSL ? 587 : 25;
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';

$config['support_url'] = '';
$config['product_name'] = 'PlatformManager Webmail';
$config['des_key'] = '__RCDESKEY';

$config['plugins'] = array(
    'archive',
    'zipdownload',
    'contextmenu',
    'logout_redirect',
    'pmng_sso',
    'pmng_aliases'
);

$config['skin'] = 'elastic';

$config['log_driver'] = 'file';
$config['log_date_format'] = 'd-M-Y H:i:s O';
$config['log_session_id'] = 8;
$config['log_file_ext'] = '.log';
$config['smtp_log'] = true;
$config['log_logins'] = true;
$config['session_debug'] = true;
$config['sql_debug'] = true;
$config['imap_debug'] = true;
$config['ldap_debug'] = true;
$config['smtp_debug'] = true;

$config['htmleditor'] = 4;
//  0 - never,
//  1 - always,
//  2 - on reply to HTML message,
//  3 - on forward or reply to HTML message
//  4 - always, except when replying to plain text message

$config['logout_redirect_url'] = 'http'.(__enableSSL ? "s" : "").'://admin.__ROOT_DOMAIN/panel/dashboard';