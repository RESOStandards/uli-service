const utils = require("utils");
const sessionService = require("services/session");

const authorizationMiddleware = async (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    req.headers.Authorization = "Basic test";
    next();
  } else {
    const { authorization } = req.headers;
    if (authorization) {
      req.headers.Authorization = authorization;
      req.headers.userInfo = await sessionService.getSession(authorization);
    }
    next();
  }
};

const publicApiAuthorizationMiddleware = async (req, res, next) => {
  const { authorization, isadmin } = req.headers;
  if (authorization) {
    req.headers.Authorization = authorization;
    req.headers.userInfo = await sessionService.getSession(authorization);
    req.headers.isAdmin = isadmin;
  } else {
    req.headers.Authorization = `Basic ${utils.adminCredentialsEncoded}`;
    req.headers.isPublic = true;
  }
  next();
};

module.exports = {
  authorizationMiddleware,
  publicApiAuthorizationMiddleware,
};
