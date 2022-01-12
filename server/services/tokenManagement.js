const logger = require("logger");
const axios = require("axios");
const elasticUtils = require("utils/elastic");
const userService = require("services/user");
const accessManagementConstants = require("commonConstants/accessManagement");

const listAdminApiKeys = async (username, headerOptions) => {
  try {
    const body = {
      username,
    };
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `/_security/api_key/`,
      data: body,
      headers: headerOptions,
    });
    return response.data.api_keys.filter(
      (key) => key.name.startsWith("admin") && !key.invalidated
    );
  } catch (error) {
    logger.error(
      `Error while fetching the admin api keys in Elastic Service`,
      error
    );
    return Promise.reject(error);
  }
};
//a helper method to calucalte the count of existing apikeys
const listAllApiKeys = async (headerOptions) => {
  try {
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: `/_security/api_key`,
      headers: headerOptions,
    });
    return response.data;
  } catch (error) {
    logger.error(
      `Error while fetching all the api keys in Elastic Service`,
      error
    );
    return Promise.reject(error);
  }
};

const createApiKey = async (username, headerOptions) => {
  try {
    const userInfo = await userService.findUser(username, headerOptions);
    if (!userInfo) {
      return Promise.reject(`Username ${username} doesn not exist`);
    }
    const numberOfApiKeys = (await listAllApiKeys(headerOptions)).api_keys
      .length;
    const body = {
      name: `token-${numberOfApiKeys + 1}`,
      role_descriptors: {
        reso_role: {
          index: accessManagementConstants.resoRolePrivileges,
        },
      },
    };
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: `/_security/api_key`,
      data: body,
      headers: headerOptions,
    });
    userInfo.metadata.apiKeys = [
      ...(userInfo.metadata.apiKeys || []),
      response.data,
    ];
    return { userInfo };
  } catch (error) {
    logger.error(`Error while creating api key in Elastic Service`, error);
    return Promise.reject(error);
  }
};

const createAndAssignApiKey = async (username, headerOptions) => {
  try {
    const { userInfo } = await createApiKey(username, headerOptions);
    await userService.createOrUpdateUser(
      {
        username,
        userInfo,
        update: true,
      },
      headerOptions
    );
    return userInfo;
  } catch (error) {
    logger.error(
      `Error while creating and assigning api key in Elastic Service`,
      error
    );
    return Promise.reject(error);
  }
};

const createApiKeyForAdmin = async ({ username, password }, headerOptions) => {
  try {
    const body = {
      grant_type: "password",
      username: username,
      password: password,
      api_key: {
        name: `admin-${username}`,
      },
    };
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: "_security/api_key/grant",
      data: body,
      headers: headerOptions,
    });
    return { tokenData: response.data };
  } catch (error) {
    logger.error(
      `Error while creating api key for admin in Elastic Service for username => ${username}`,
      error
    );
    return Promise.reject(error);
  }
};

const deleteApiKey = async ({ username, tokenId }, headerOptions) => {
  try {
    const userInfo = await userService.findUser(username, headerOptions);
    const body = {
      id: tokenId,
    };
    //invalidate the apikey
    await axios({
      method: "DELETE",
      baseURL: elasticUtils.baseUrl,
      url: "_security/api_key",
      data: body,
      headers: headerOptions,
    });
    userInfo.metadata.apiKeys = userInfo.metadata.apiKeys.filter(
      (key) => key.id !== tokenId
    );
    //remove the apikey info from the user metadata
    await userService.createOrUpdateUser(
      {
        username,
        userInfo,
        update: true,
      },
      headerOptions
    );
    return {
      success: true,
    };
  } catch (error) {
    logger.error(
      `Error while deleting api key in Elastic Service for username => ${username}`,
      error
    );
    return Promise.reject(error);
  }
};

const invalidateAdminApiKey = async ({ username, tokenId }, headerOptions) => {
  try {
    const body = {
      id: tokenId,
    };
    await axios({
      method: "DELETE",
      baseURL: elasticUtils.baseUrl,
      url: "_security/api_key",
      data: body,
      headers: headerOptions,
    });
    return "api keys invalidated";
  } catch (error) {
    logger.error(
      `Error while deleting api key in Elastic Service for username => ${username}`,
      error
    );
    return Promise.reject(error);
  }
};

module.exports = {
  listAdminApiKeys,
  createApiKey,
  deleteApiKey,
  createAndAssignApiKey,
  createApiKeyForAdmin,
  invalidateAdminApiKey,
};
