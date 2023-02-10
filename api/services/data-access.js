"use strict";
const { get, post, head } = require("axios");
const { ULI_TEMPLATE, ULI_SERVICE_INDEX_NAME } = require("./const");

const ES_HOST = process.env.ES_HOST || "localhost";
const ES_URL = "http://" + ES_HOST + ":9200";


const indexExists = async indexName => {
  try {
    const { status } = await head(`${ES_URL}/${indexName}`);
    return status === 200;
  } catch (err) {
    return false;
  }
};

const createFilters = (fieldValues = [], uliTemplate = ULI_TEMPLATE ) =>
  fieldValues.flatMap(({ fieldName, value }) => {
    if (value && uliTemplate[fieldName]) {
      const filterValue = uliTemplate[fieldName];
      filterValue.filter.fuzzy[fieldName].value = value;
      return filterValue;
    } else {
      return [];
    }
  });

const search = async (fieldValues = [], explain = false, uliTemplate) => {
  try {
    const queryParams = {
      query: {
        function_score: {
          boost: 1,
          functions: createFilters(fieldValues, uliTemplate),
          max_boost: 10,
          score_mode: "sum",
          boost_mode: "multiply",
          min_score: 2
        },
      },
      explain
    };

    // console.debug(`Query is: ${JSON.stringify(fieldValues)}`);

    const { data } = await get(`${ES_URL}/${ULI_SERVICE_INDEX_NAME}/_search`, {
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
      uliData.flatMap(licensee => {
        return [
          JSON.stringify({ index: {} }),
          JSON.stringify({
            ingestTimestamp: new Date().toISOString(),
            providerUoi,
            status: "unprocessed",
            ...licensee,
          })
        ]
      }).join("\n") + "\n";

    const response = await post(
      `${ES_URL}/${ULI_SERVICE_INDEX_NAME}/_bulk`,
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
  indexExists
};
