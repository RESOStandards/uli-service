const logger = require("logger");
const axios = require("axios");
const elasticUtils = require("utils/elastic");
const Promise = require("bluebird");
const _ = require("lodash");
const geohash = require("ngeohash");
const organizationService = require("services/organization");
const indexMapping = {
  mappings: {
    properties: {
      location: {
        type: "geo_point",
      },
      certificationDate: {
        type: "date",
        format: "strict_date_optional_time_nanos",
      },
    },
  },
};

const bulkCreateFields = async (fields, report, headerOptions) => {
  try {
    const indexName = "report-fields";
    if (!(await elasticUtils.isIndexExist(headerOptions, indexName))) {
      await elasticUtils.createIndexWithMapping(
        headerOptions,
        indexName,
        indexMapping
      );
    }
    let bulkString = "";
    for (const field of fields) {
      const reportField = { ...field, ...report };
      bulkString += `${JSON.stringify({ index: {} })}\n`;
      bulkString += `${JSON.stringify(reportField)}\n`;
    }
    bulkString += `\n`;
    await bulkCreate(indexName, bulkString, headerOptions);
  } catch (error) {
    logger.error(`Error while bulk insert`, error);
    return Promise.reject(error);
  }
};

const bulkCreateLookups = async (lookups, report, headerOptions) => {
  try {
    const indexName = "report-lookups";
    if (!(await elasticUtils.isIndexExist(headerOptions, indexName))) {
      await elasticUtils.createIndexWithMapping(
        headerOptions,
        indexName,
        indexMapping
      );
    }
    let bulkString = "";
    for (const lookup of lookups) {
      const reportLookup = { ...lookup, ...report };
      bulkString += `${JSON.stringify({ index: {} })}\n`;
      bulkString += `${JSON.stringify(reportLookup)}\n`;
    }
    bulkString += `\n`;
    await bulkCreate(indexName, bulkString, headerOptions);
  } catch (error) {
    logger.error(`Error while bulk insert`, error);
    return Promise.reject(error);
  }
};

const bulkCreate = async (indexName, bulkJSON, headerOptions) => {
  const { data } = await axios({
    method: "POST",
    baseURL: elasticUtils.baseUrl,
    url: `/${indexName}/_bulk`,
    headers: { ...headerOptions, "Content-Type": "application/x-ndjson" },
    data: bulkJSON,
  });
  if (data.errors) {
    throw new Error(data.items[0].index.error.reason);
  }
};

const create = async (reportBody, certificationId, headerOptions) => {
  const {
    fields,
    recipientUoi,
    version,
    providerUoi,
    generatedOn,
  } = reportBody;
  const org = await organizationService.getOrganization(
    recipientUoi,
    headerOptions
  );
  const location = geohash.encode(org.latitude, org.longitude, 8);
  const report = {
    recipientUoi,
    version,
    providerUoi,
    certificationId,
    certificationDate: generatedOn,
    location,
  };
  await bulkCreateFields(fields, report, headerOptions);
  await bulkCreateLookups(fields, report, headerOptions);
};

module.exports = {
  create,
};
