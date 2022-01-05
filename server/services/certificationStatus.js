const axios = require("axios");
const utils = require("utils");
const elasticUtils = require("utils/elastic");

const CERTIFICATION_STATUS_INDEX = "certification-status";
const indexMapping = {
  mappings: {
    properties: {
      status: {
        type: "text",
      },
      user: {
        type: "text",
      },
      createdAt: {
        type: "date",
        format: "strict_date_optional_time_nanos",
      },
      ipAddress: {
        type: "text",
      },
      reportId: {
        type: "text",
      },
    },
  },
};

const create = async (headerOptions, status) => {
  try {
    const doesExist = await elasticUtils.isIndexExist(
      headerOptions,
      CERTIFICATION_STATUS_INDEX
    );
    if (!doesExist) {
      await elasticUtils.createIndexWithMapping(
        headerOptions,
        CERTIFICATION_STATUS_INDEX,
        indexMapping
      );
    }
    await axios({
      method: "POST",
      baseURL: elasticUtils.baseUrl,
      url: `/${CERTIFICATION_STATUS_INDEX}/_doc/`,
      data: status,
      headers: headerOptions,
    });
  } catch (error) {
    return Promise.reject(utils.getErrorMessageFromElastic(error) || error);
  }
};

module.exports = {
  create,
};
