const logger = require("logger");
const axios = require("axios");
const utils = require("utils");
const _ = require("lodash");

const elasticUtils = require("utils/elastic");

const SESSIONS_INDEX = "sessions";
const adminAuthorization = {
  Authorization: `Basic ${utils.adminCredentialsEncoded}`
};

const createSession = async (
  loginInfo,
  headerOptions
) => {
  try {
    const doesExist = await elasticUtils.isIndexExist(
      headerOptions,
      SESSIONS_INDEX
    );
    if (!doesExist) {
      await elasticUtils.createIndexWithMapping(
        headerOptions,
        SESSIONS_INDEX,
      );
    }
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: `/${SESSIONS_INDEX}/_doc/?refresh=wait_for`,
      data: loginInfo,
      headers: headerOptions,
    });
    return response.data;
  } catch (error) {
    logger.error(
      `Error while creating Session =>  ${JSON.stringify(
        utils.getErrorMessageFromElastic(error) || error
      )}`
    );
    return Promise.reject(utils.getErrorMessageFromElastic(error) || error);
  }
};


const deleteSession = async (token) => {
  try {
    const body = {
      query: {
        match: {
          token
        }
      }
    };
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: `/${SESSIONS_INDEX}/_delete_by_query`,
      data: body,
      headers: adminAuthorization,
    });
    return response.data;
  } catch (error) {
    logger.error(`Error while deleting Sesssion in Elastic Service`, error);
    return Promise.reject(error);
  }
};

const getSession = async (token) => {
  try {
    const body = {
      query: {
        match: {
          token
        }
      }
    };
    const response = await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: `/${SESSIONS_INDEX}/_search`,
      data: body,
      headers: adminAuthorization,
    });
    return response.data.hits.hits[0]._source;
  } catch (error) {
    logger.info("Session could not be found");
    return null;
  }
};


module.exports = {
  createSession,
  deleteSession,
  getSession
};
