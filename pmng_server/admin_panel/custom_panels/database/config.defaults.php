<?php

$cfg['blowfish_secret'] = "__PMABL";
$cfg['PmaAbsoluteUri'] = "__PMAURI";
$cfg['TempDir'] = "/var/project/temp";
$cfg['ShowServerInfo'] = false;
$cfg['ShowStats'] = false;

$cfg['TitleTable'] = "@VSERVER@ / @DATABASE@ / @TABLE@ | @PHPMYADMIN@";
$cfg['TitleDatabase'] = "@VSERVER@ / @DATABASE@ | @PHPMYADMIN@";
$cfg['TitleServer'] = "@VSERVER@ | @PHPMYADMIN@";
$cfg['TitleDefault'] = "Platform Manager Databases | @PHPMYADMIN@";

$i = 0;

function addPmaFeatures($cfg, $i) {
    $cfg['Servers'][$i]['pmadb'] = 'phpmyadmin';
    $cfg['Servers'][$i]['bookmarktable'] = 'pma__bookmark';
    $cfg['Servers'][$i]['relation'] = 'pma__relation';
    $cfg['Servers'][$i]['table_info'] = 'pma__table_info';
    $cfg['Servers'][$i]['table_coords'] = 'pma__table_coords';
    $cfg['Servers'][$i]['pdf_pages'] = 'pma__pdf_pages';
    $cfg['Servers'][$i]['column_info'] = 'pma__column_info';
    $cfg['Servers'][$i]['history'] = 'pma__history';
    $cfg['Servers'][$i]['table_uiprefs'] = 'pma__table_uiprefs';
    $cfg['Servers'][$i]['tracking'] = 'pma__tracking';
    $cfg['Servers'][$i]['userconfig'] = 'pma__userconfig';
    $cfg['Servers'][$i]['recent'] = 'pma__recent';
    $cfg['Servers'][$i]['favorite'] = 'pma__favorite';
    $cfg['Servers'][$i]['users'] = 'pma__users';
    $cfg['Servers'][$i]['usergroups'] = 'pma__usergroups';
    $cfg['Servers'][$i]['navigationhiding'] = 'pma__navigationhiding';
    $cfg['Servers'][$i]['savedsearches'] = 'pma__savedsearches';
    $cfg['Servers'][$i]['central_columns'] = 'pma__central_columns';
    $cfg['Servers'][$i]['designer_settings'] = 'pma__designer_settings';
    $cfg['Servers'][$i]['export_templates'] = 'pma__export_templates';

    return $cfg;
}

$i++;
$cfg['Servers'][$i]['host'] = "mariadb";
$cfg['Servers'][$i]['port'] = "3306";
$cfg['Servers'][$i]['verbose'] = "Projects database";
$cfg['Servers'][$i]['hide_db'] = '^(information_schema)$';
$cfg['Servers'][$i]['controluser'] = "__CTRLUSER";
$cfg['Servers'][$i]['controlpass'] = "__CTRLPASS";
$cfg = addPmaFeatures($cfg, $i);

if(__ALLOW_ADMIN) {
    $i++;
    $cfg['Servers'][$i]['socket'] = "__DBSOCKET";
    $cfg['Servers'][$i]['AllowDeny']['order'] = 'explicit';
    $cfg['Servers'][$i]['AllowDeny']['rules'] = ['allow root from all'];
    $cfg['Servers'][$i]['verbose'] = "Administration database";
    $cfg = addPmaFeatures($cfg, $i);
}

?>