const { statusOptions } = require("./reportFilters");

const statusConstants = statusOptions.reduce((result, statusOption) => {
  result[statusOption.value] = statusOption;
  return result;
}, {});

const testingServers = [
  {
    displayName: "Jenkins QA - Central U.S. - Linode",
    url: "https://<user>:<token>@tester.reso.org:8443",
  },
];

module.exports = {
  statusConstants,
  testingServers,
};
