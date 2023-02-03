"use strict";
const { get, post } = require("axios");

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

const search = async () => {
  try {
    const { data } = await get(`${ES_URL}/${ULI_SERVICE_INDEX}/_search`);
    return data?.hits?.hits || [];
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
