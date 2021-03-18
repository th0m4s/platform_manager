const privileges = require("../privileges");
privileges.drop();

require("./local_net_server").start();
require("./local_web_server").start();