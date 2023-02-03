"use strict";
const { get } = require("axios");

const ES_HOST = process.env.ES_HOST || 'localhost';
const ES_URL = 'http://' + ES_HOST + ':9200';

const ULI_SERVICE_INDEX = "uli-service",
  ULI_SERVICE_INGEST_INDEX = "uli-service-ingest";

const indexExists = async indexName => {
  try {
    const { statusCode } = await get(`${ES_URL}/${indexName}`);
    return statusCode === 200;
  } catch (err) {
    return false;
  }
}

const search = async () => {
  try {
    if (await indexExists(ULI_SERVICE_INDEX)) {
      return [];
    } else {
      return [];
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  search,
};
