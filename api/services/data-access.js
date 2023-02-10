"use strict";
const { get, post } = require("axios");
const { query } = require("express");
const { ULI_TEMPLATE } = require("./const");

const ES_HOST = process.env.ES_HOST || "localhost";
const ES_URL = "http://" + ES_HOST + ":9200";

const ULI_SERVICE_INDEX = "uli-service";

const indexExists = async (indexName) => {
  try {
    const { statusCode } = await get(`${ES_URL}/${indexName}`);
    return statusCode === 200;
  } catch (err) {
    return false;
  }
};

const createFilters = (fieldValues = []) =>
  fieldValues.flatMap(({ fieldName, value }) => {
    if (value && ULI_TEMPLATE[fieldName]) {
      const filterValue = ULI_TEMPLATE[fieldName];
      filterValue.filter.fuzzy[fieldName].value = value;
      return filterValue;
    } else {
      return [];
    }
  });

const search = async (fieldValues = [], explain = false) => {
  try {
    const queryParams = {
      query: {
        function_score: {
          boost: 1,
          functions: createFilters(fieldValues),
          max_boost: 10,
          score_mode: "sum",
          boost_mode: "multiply",
          min_score: 2
        },
      },
      explain
    };
    const { data } = await get(`${ES_URL}/${ULI_SERVICE_INDEX}/_search`, {
      data: queryParams,
    });

    return data?.hits || [];
  } catch (err) {
    console.error(err);
    return [];
  }
};

/*

  Must be one record per line (unformatted)

  POST /uli-service/_bulk
  {"index": {}}
  {"MemberFullName": "ohai", "MemberLastName": "ohai", "MemberFirstName": "ohai", "MemberMiddleInitial": "ohai", "MemberNickname": "ohai", "MemberType": "ohai", "MemberNationalAssociationId": "ohai", "MemberStateLicense": "ohai", "MemberStateLicenseType": "ohai", "MemberStateLicenseState": "ohai", "MemberMlsId": "ohai", "OfficeName": "ohai", "OfficeMlsId": "ohai", "SourceSystemID": "ohai", "SourceSystemName": "ohai", "OriginatingSystemID": "ohai", "OriginatingSystemName": "ohai"}

*/
const ingest = async (providerUoi, uliData = []) => {
  if (!uliData?.length) {
    return [];
  }

  try {
    const ndJson =
      uliData.reduce((acc, licensee) => {
        acc += JSON.stringify({ index: {} }) + "\n";
        acc +=
          JSON.stringify({
            ingestTimestamp: new Date().toISOString(),
            providerUoi,
            status: "unprocessed",
            ...licensee,
          }) + "\n";
        return acc;
      }, "") + "\n";

    const response = await post(
      `${ES_URL}/${ULI_SERVICE_INDEX}/_bulk`,
      ndJson,
      {
        headers: { "Content-Type": "application/x-ndjson" },
      }
    );
    return response;
  } catch (err) {
    console.log(err);
    return [];
  }
};

module.exports = {
  search,
  ingest,
};
