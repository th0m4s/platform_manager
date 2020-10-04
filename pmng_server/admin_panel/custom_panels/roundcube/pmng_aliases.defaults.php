<?php

class pmng_aliases extends rcube_plugin
{
  public $task = 'login';

  function init()
  {
    $this->add_hook('login_after', array($this, 'login_after'));
  }

  function login_after($args)
  {
    $db = null;
    try {
      $db = new PDO("mysql:dbname=__DBNAME;unix_socket=__DBSOCKET", "__DBUSER", "__DBPASS");
    } catch (PDOException $e) {
      // dont create aliases
      return;
    }

    $user = rcmail::get_instance()->user;
    $email = $user->get_username();

    $aliasesStatement = $db->query("SELECT `source` FROM `virtual_aliases` WHERE `destination`='$email';");
    if($aliasesStatement === false) return;
    $aliasesResults = $aliasesStatement->fetchAll();
    
    $requiredIdentities = [];
    foreach($aliasesResults as $alias) {
      $requiredIdentities[] = $alias["source"];
    }

    $identities = $user->list_identities();
    foreach($identities as $identity) {
      $reqKey = array_search($identity["email"], $requiredIdentities);
      if($reqKey === false) {
        if($identity["email"] != $email) {
          $user->delete_identity($identity["identity_id"]);
        }
      } else {
        unset($requiredIdentities[$reqKey]);
      }
    } 

    foreach($requiredIdentities as $requiredIdentity) {
      $user->insert_identity(array(
        'user_id'  => $user->id,
        'standard' => 0,
        'email'    => $requiredIdentity,
        'name'     => ""
      ));
    }
  }

}

