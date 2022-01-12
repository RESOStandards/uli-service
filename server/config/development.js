const logger = require("../logger");
const logMeta = {
  event: "elastic",
  fg: "white",
  bg: "bgGreen",
};

module.exports = {
  logging: (message) => {
    logger.log("info", message, logMeta);
  },
  domain: "localhost",
  elastic: {
    username: "elastic",
    password: "elastic",
  },
};
