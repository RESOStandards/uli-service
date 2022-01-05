const config = require("config");
const btoa = require("btoa");

const _ = require("lodash");

const getBasicAuthenticationHeaders = (base64encoded) => {
  return {
    Authorization: `Basic ${base64encoded}`,
  };
};
const environment = config.envConfig;
let adminCredentialsEncoded;
if (environment) {
  adminCredentialsEncoded = btoa(
    `${environment?.elastic?.username}:${environment?.elastic?.password}`
  );
}

const base64Encode = (key1, key2) => btoa(`${key1}:${key2}`);

const getIpAddress = (req) => {
  return (req.headers["x-forwarded-for"] || req.connection.remoteAddress || "")
    ?.split(",")[0]
    .trim();
};

const getErrorMessageFromElastic = (error) => {
  return error?.response?.data?.error?.root_cause?.[0]?.reason || null;
};

const roundPercentage = (value) => {
  if (value <= 1) return Math.round(value * 10) / 10;
  if (value >= 99) return Math.round(value * 10) / 10;
  return Math.round(value);
};

module.exports = {
  getBasicAuthenticationHeaders,
  base64Encode,
  adminCredentialsEncoded,
  getIpAddress,
  getErrorMessageFromElastic,
  roundPercentage,
};
