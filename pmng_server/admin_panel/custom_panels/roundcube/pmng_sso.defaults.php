<?php

class pmng_sso extends rcube_plugin
{
  // public $task = 'login';
  public $login_url = "/panel/login/sso/webmail";

  function init()
  {
    $this->add_hook('startup', array($this, 'startup'));
    $this->add_hook('authenticate', array($this, 'authenticate'));
  }

  function startup($args)
  {
    if (/*empty($_SESSION['user_id'])*/!empty($_GET["sso"]) && strtolower($_GET["sso"]) == "pmng" && !empty($_GET['key']))
    {
      $args['task'] = 'login';
      $args['action'] = 'login';
    }

    return $args;
  }

  function authenticate($args)
  {
    if (!empty($_GET['key'])) {
      if(empty($_GET["uid"])) {
        header("Location: /panel/mails/users", true, 302);
        exit;
      } else {
        $key = $_GET["key"];

        $db = null;
        try {
          $db = new PDO("mysql:dbname=__DBNAME;unix_socket=__DBSOCKET", "__DBUSER", "__DBPASS");
        } catch (PDOException $e) {
          die(header("Location: /panel/error/mailsso/pdo"));
        }

        $keyStatement = $db->query("SELECT `userid` FROM `keys` WHERE `key`='$key' AND `expired`='false';");
        $keyResult = $keyStatement->fetch();
        if($keyResult === false)
          die(header("Location: $login_url", true, 302));
        
        $userId = $keyResult["userid"];


        $mid = $_GET["uid"];
        $mailStatement = $db->query("SELECT `sso_decrypt`,`email`,`projectname` FROM `__MAIL_DBNAME`.`virtual_users` WHERE `id`=$mid AND (`projectname` IN(SELECT `name` FROM `__DBNAME`.`projects` WHERE `ownerid`=$userId) OR `projectname` IS NULL);");
        $mailResult = $mailStatement->fetch();
        if($mailResult === false)
          die(header("Location: /panel/error/mailsso/uid", true, 302));

        if($mailResult["projectname"] == null) {
          $userStatement = $db->query("SELECT `scope` FROM `users` WHERE `id`=$userId");
          $userResult = $userStatement->fetch();
          if($userResult === false)
            die(header("Location: /panel/error/mailsso/uid"));
          
          if($userResult["scope"] > 1)
            die(header("Location: /panel/error/mailsso/scope"));
        }
        
        $args['user'] = $mailResult["email"];
        $args['pass'] = $mailResult["sso_decrypt"];
        $args['cookiecheck'] = false;
        $args['valid'] = true;
      }
    }

    return $args;
  }

}

