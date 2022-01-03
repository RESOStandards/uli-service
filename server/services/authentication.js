const logger = require("logger");
const utils = require("utils");
const elasticUtils = require("utils/elastic");
const axios = require("axios");
const _ = require("lodash");

const login = async ({ username, password }) => {
  try {
    const userCredentialsEncoded = utils.base64Encode(username, password);
    const response = await axios({
      method: "GET",
      baseURL: elasticUtils.baseUrl,
      url: "_security/_authenticate",
      headers: utils.getBasicAuthenticationHeaders(userCredentialsEncoded),
    });
    let token = "";
    const isAdmin = response.data.roles.includes("superuser");
    if (isAdmin) {
      token = userCredentialsEncoded;
    } else {
      if (_.isEmpty(response.data.metadata.apiKeys)) {
        throw new Error(`No api key assigned for the user => ${username}`);
      } else {
        const apiKeyData = response.data.metadata.apiKeys[0];
        token = utils.base64Encode(apiKeyData.id, apiKeyData.api_key);
      }
    }
    return {
      token,
      isAdmin,
      username,
      uoi: response.data.metadata.uoi,
      fullName: response.data.full_name,
      email: response.data.email,
      apiKeys: response.data.metadata.apiKeys,
    };
  } catch (error) {
    logger.error(
      `Error while logging in Elastic Service for username => ${username}`,
      utils.getErrorMessageFromElastic(error) || error
    );
    return null;
  }
};

module.exports = {
  login,
};
