<?php

$config = array();

$config['db_dsnw'] = 'mysql://__DBUSER:__DBPASS@unix(__DBSOCKET)/__DBNAME';

$config['default_host'] = 'mails.__ROOT_DOMAIN';
$config['smtp_server'] = 'mails.__ROOT_DOMAIN';
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

// log driver:  'syslog', 'stdout' or 'file'.
$config['log_driver'] = 'file';

// date format for log entries
// (read http://php.net/manual/en/function.date.php for all format characters)  
$config['log_date_format'] = 'd-M-Y H:i:s O';

// length of the session ID to prepend each log line with
// set to 0 to avoid session IDs being logged.
$config['log_session_id'] = 8;

// Default extension used for log file name
$config['log_file_ext'] = '.log';

// Log sent messages to <log_dir>/sendmail.log or to syslog
$config['smtp_log'] = true;

// Log successful/failed logins to <log_dir>/userlogins.log or to syslog
$config['log_logins'] = true;

// Log session debug information/authentication errors to <log_dir>/session.log or to syslog
$config['session_debug'] = true;

// Log SQL queries to <log_dir>/sql.log or to syslog
$config['sql_debug'] = true;

// Log IMAP conversation to <log_dir>/imap.log or to syslog
$config['imap_debug'] = true;

// Log LDAP conversation to <log_dir>/ldap.log or to syslog
$config['ldap_debug'] = true;

// Log SMTP conversation to <log_dir>/smtp.log or to syslog
$config['smtp_debug'] = true;
