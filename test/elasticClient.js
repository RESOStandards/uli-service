const elasticsearch = require("elasticsearch");
const esHost = process.env.ES_HOST || "localhost";

const esUrl = `http://${esHost}:9200/`;

const client = elasticsearch.Client({
  host: esUrl,
  maxRetries: 5,
  requestTimeout: 60000,
});

module.exports = client;
