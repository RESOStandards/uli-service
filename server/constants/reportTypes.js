const reportTypes = {
  DATA_DICTIONARY: {
    name: "data_dictionary",
  },
  WEB_API_SERVER_CORE: {
    name: "web_api_server_core",
  },
  DATA_DICTIONARY_WITH_IDX_PAYLOAD: {
    name: "data_dictionary_with_IDX_payload",
  },
  DATA_AVAILABILITY: {
    name: "data_availability"
  }
};

const marketAverageTypes = {
  DATA_AVAILABILITY_MARKET_AVG:{
    name: "data_availability_market_average"
  },
  DIFFERENCE_REPORT_MARKET_AVG:{
    name: "difference_report_market_average"
  }
}

module.exports = {
  reportTypes,
  marketAverageTypes
};
