const logger = require("logger");
const tokenManagementService = require("services/tokenManagement");
const utils = require("utils");

const createAndAssignApiKeyForUser = async (req, res) => {
  try {
    let { username } = req.query;
    const { Authorization, isPublic, isAdmin } = req.headers;
    username = username.toLowerCase().trim();
    let headerOptions = { Authorization };
    // if the user is a normal user
    if (!isPublic && !isAdmin) {
      headerOptions = {
        Authorization: `Basic ${utils.adminCredentialsEncoded}`,
      };
    }
    const userInfo = await tokenManagementService.createAndAssignApiKey(
      username,
      headerOptions
    );
    return res.send(userInfo);
  } catch (error) {
    logger.error("Create apikeys for users Controller API: ", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

const createApiKeyForAdmin = async (req, res) => {
  try {
    let { username, password } = req.body;
    username = username.toLowerCase().trim();
    const { Authorization } = req.headers;
    const data = await tokenManagementService.createApiKeyForAdmin(
      { username, password },
      {
        Authorization,
      }
    );
    return res.send(data);
  } catch (error) {
    logger.error("Create api key for admin Controller API: ", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

const listAdminApiKeys = async (req, res) => {
  try {
    let { username } = req.query;
    const { Authorization } = req.headers;
    username = username.toLowerCase().trim();
    const apiData = await tokenManagementService.listAdminApiKeys(username, {
      Authorization,
    });
    return res.send(apiData);
  } catch (error) {
    logger.error("List api keys Controller API: ", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

const deleteApiKey = async (req, res) => {
  try {
    let { username, tokenId } = req.query;
    username = username.toLowerCase().trim();
    const { Authorization, isPublic, isAdmin } = req.headers;
    let headerOptions = { Authorization };
    // if the user is a normal user
    if (!isPublic && !isAdmin) {
      headerOptions = {
        Authorization: `Basic ${utils.adminCredentialsEncoded}`,
      };
    }
    const tokenData = await tokenManagementService.deleteApiKey(
      { username, tokenId },
      headerOptions
    );
    return res.send(tokenData);
  } catch (error) {
    logger.error("Delete api key Controller API:", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

const deleteAdminApiKey = async (req, res) => {
  try {
    let { username, tokenId } = req.query;
    const { Authorization } = req.headers;
    username = username.toLowerCase().trim();
    const tokenData = await tokenManagementService.invalidateAdminApiKey(
      { username, tokenId },
      { Authorization }
    );
    return res.send(tokenData);
  } catch (error) {
    logger.error("Delete api key Controller API:", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

module.exports = {
  deleteApiKey,
  createAndAssignApiKeyForUser,
  createApiKeyForAdmin,
  listAdminApiKeys,
  deleteAdminApiKey,
};
