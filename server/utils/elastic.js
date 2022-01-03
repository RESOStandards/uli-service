const logger = require("logger");
const axios = require("axios");
const _ = require("lodash");

const esHost = process.env.ES_HOST;
const baseUrl = `http://${esHost}:9200/`;

const createIndexWithMapping = async (headerOptions, index, indexMapping) => {
  await axios({
    method: "PUT",
    baseURL: baseUrl,
    url: `/${index}`,
    data: indexMapping,
    headers: headerOptions,
  });
};

const isIndexExist = async (headerOptions, index) => {
  let indexExist = true;
  try {
    await axios({
      method: "HEAD",
      baseURL: baseUrl,
      url: `/${index}`,
      headers: headerOptions,
    });
  } catch (error) {
    //The control comes to this part of code when elastic return 404 Not found error for the index, else the index is found.
    if (error.response) {
      indexExist = !_.isEmpty(error.response.data);
    } else {
      logger.info(error);
      throw new Error(error);
    }
  }
  return indexExist;
};

module.exports = {
  baseUrl,
  createIndexWithMapping,
  isIndexExist,
};
