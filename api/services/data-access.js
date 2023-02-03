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
    const { data } = await get(`${ES_URL}/${ULI_SERVICE_INDEX}/_search`);
    return data?.hits?.hits || [];
  } catch (err) {
    console.error(err);
    return [];
  }
};

const ingest = async ( uliData = [] ) => {
  try {
    const response = await axios.post(

    );
  } catch (err) {

  }
};

module.exports = {
  search,
};
