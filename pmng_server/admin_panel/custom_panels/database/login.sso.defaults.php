<?php
//ini_set("display_errors", "1");
$loginUrl = "/panel/login/sso/database";
$sessionName = 'PMNGSignonSession';

if(isset($_GET["key"])) {
    $key = $_GET["key"];

    $db = null;
    try {
        $db = new PDO("mysql:dbname=__DBNAME;unix_socket=__DBSOCKET", "__DBUSER", "__DBPASS");
    } catch (PDOException $e) {
        die(header("Location: /panel/error/dbsso/pdo"));
    }

    $keyStatement = $db->query("SELECT `userid` FROM `keys` WHERE `key`='$key' AND `expired`='false';");
    $keyResult = $keyStatement->fetch();
    if($keyResult === false)
        die(header("Location: $loginUrl"));
    
    $userId = $keyResult["userid"];
    $userStatement = $db->query("SELECT `dbautopass`,`name` FROM `users` WHERE `id`=$userId");
    $userResult = $userStatement->fetch();
    if($userResult === false)
        die(header("Location: /panel/error/dbsso/uid"));

    $dbAutoPass = $userResult["dbautopass"];
    $username = $userResult["name"];

    session_name($sessionName);
    session_start(); // add @ before call to silence errors

    $_SESSION["PMA_single_signon_user"] = "dbau_$username";
    $_SESSION["PMA_single_signon_password"] = $dbAutoPass;
    $_SESSION['PMA_single_signon_HMAC_secret'] = hash('sha1', uniqid(strval(rand()), true));
    session_write_close();

    header('Location: ./index.php?server=2');
} else {
    header("Location: $loginUrl");
}
?>