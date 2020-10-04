<?php

$config = array();

$config['db_dsnw'] = 'mysql://__DBUSER:__DBPASS@unix(__DBSOCKET)/__DBNAME';

$config['default_host'] = 'mail.__ROOT_DOMAIN';
$config['smtp_server'] = 'mail.__ROOT_DOMAIN';
$config['smtp_port'] = 587;
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';

$config['support_url'] = '';
$config['product_name'] = 'PlatformManager Webamil';
$config['des_key'] = '__RCDESKEY';

$config['plugins'] = array(
    'archive',
    'zipdownload',
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
