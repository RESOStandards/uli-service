"use strict";
const { ULI_TEMPLATE, ULI_SERVICE_INDEX_NAME } = require("./const");

const ES_HOST = process.env.ES_HOST || "localhost";
const ES_URL = "http://" + ES_HOST + ":9200";

const UNPROCESSED_STATUS = "unprocessed";

/**
 * Checks to see whether an index with the given name exists.
 * 
 * @param {String} indexName name of ES index to check for
 * @returns 
 */
const indexExists = async indexName => {
  try {
    const response = await fetch(`${ES_URL}/${indexName}`, { method: "HEAD" });
    return response.status === 200;
  } catch (err) {
    return false;
  }
};

/**
 * 
 * @param {*} fieldValues 
 * @param {*} uliTemplate 
 * @returns 
 */
const createFilters = (fieldValues = {}, uliTemplate = ULI_TEMPLATE) => {
  return Object.values(fieldValues).flatMap(({fieldName, value }) => {
    if (value && uliTemplate?.[fieldName]) {
      const filterValue = uliTemplate[fieldName];
      filterValue.filter.fuzzy[fieldName].value = value;
      return filterValue;
    } else {
      return [];
    }
  });
};

const search = async (fieldValues = {}, explain = false, uliTemplate = ULI_TEMPLATE) => {
  try {

    const filterValues = createFilters(fieldValues, uliTemplate);
    console.log('filterValues are: ' + JSON.stringify(filterValues));

    const queryParams = {
      query: {
        function_score: {
          boost: 1,
          functions: filterValues,
          max_boost: 10,
          score_mode: "sum",
          boost_mode: "multiply",
          min_score: 2
        },
      },
      explain
    };

    console.debug(`Query is: ${JSON.stringify(queryParams, "  ")}`);

    const response = await fetch(`${ES_URL}/${ULI_SERVICE_INDEX_NAME}/_search`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryParams),
    });

    if (!response.ok) {
      throw new Error(`ES search failed with status ${response.status}`);
    }

    const data = await response.json();
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
            status: UNPROCESSED_STATUS,
            ...licensee,
          })
        ]
      }).join("\n") + "\n";

    const response = await fetch(`${ES_URL}/${ULI_SERVICE_INDEX_NAME}/_bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body: ndJson,
    });

    if (!response.ok) {
      throw new Error(`ES bulk ingest failed with status ${response.status}`);
    }

    return await response.json();
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
