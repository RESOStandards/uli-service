const logger = require("logger");
const marketAverageService = require("services/payload/performanceMetrics/marketAverage");

const getResourcesPerformanceMarketAverage = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    const report = await marketAverageService.getResourcesPerformanceMarketAverage({ Authorization });
    return res.status(200).send(report);
  } catch (error) {
    logger.error("market average get Report Controller API:", error);
    return res.status(400).send(error);
  }
};

module.exports = {
  getResourcesPerformanceMarketAverage
};
