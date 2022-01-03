const logger = require("logger");
const authenticationService = require("services/authentication");
const sessionService = require("services/session");

const login = async (req, res) => {
  try {
    let { username, password } = req.body;
    const { Authorization } = req.headers;
    username = username.toLowerCase().trim();
    const loginInfo = await authenticationService.login({ username, password });
    await sessionService.createSession(loginInfo, { Authorization });
    if (loginInfo) {
      return res.send({
        success: true,
        message: `Valid Log in for ${username}`,
        ...loginInfo,
      });
    } else {
      return res.status(403).send({
        success: false,
        message: `Login failed for username ${username}`,
        apiKey: null,
      });
    }
  } catch (error) {
    logger.error("Login Controller API:", error);
    return res
      .status(error?.response?.status || 400)
      .send({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    await sessionService.deleteSession(Authorization);
    return res.status(204).send();
  } catch (error) {
    logger.error("Logout Controller API:", error);
    return res
      .status(error?.response?.status || 400)
      .send({ message: error.message });
  }
};

module.exports = {
  login,
  logout
};
