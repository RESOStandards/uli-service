const { reportTypes } = require("../../server/constants/reportTypes");

/*
 *
 * ***************************************************************
 * CAUTION !!! please update tests if you are changing constants *
 * ***************************************************************
 *
 */
const webApiReport = {
  description: "Web API Server Core",
  version: "2.0.0",
  type: reportTypes.WEB_API_SERVER_CORE.name,
  generatedOn: "2021-04-13T03:55:52.512475Z",
  authentication: ["bearer token", "client credentials"],
  odataVersion: "4.0.1",
  parameters: [
    { name: "Resource", value: "Property" },
    { name: "Key Field", value: "ListingKey" },
    { name: "Integer Field", value: "BedroomsTotal" },
    { name: "Decimal Field", value: "ListPrice" },
    { name: "Single Lookup Field", value: "StandardStatus" },
    { name: "Single Lookup Value", value: "ActiveUnderContract" },
    { name: "Multi Lookup Field", value: "AccessibilityFeatures" },
    { name: "Multi Lookup Value 1", value: "AccessibleApproachWithRamp" },
    { name: "Multi Lookup Value 2", value: "Visitable" },
    { name: "Date Field", value: "ListingContractDate" },
    { name: "Timestamp Field", value: "ModificationTimestamp" },
  ],
};

module.exports = {
  webApiReport,
};
