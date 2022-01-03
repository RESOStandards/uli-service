const logger = require("logger");
const providerMetricsService = require("services/payload/performanceMetrics/providerMetrics");

const getProviderMetrics = async (req, res) => {
  try {
    const { Authorization, userInfo, isAdmin } = req.headers;
    const { reportId } = req.params;
    const { token } = req.query
    const report = await providerMetricsService.getProviderMetrics(
      { Authorization }, {
        userInfo,
        isAdmin,
        token,
        reportId
      } );
    return res.status(200).send(report);
  } catch (error) {
    logger.error("market average get Report Controller API:", error);
    return res.status(400).send(error);
  }
};

const updateOptedInStatus = async (req, res) => {
  try {
    const { Authorization, userInfo } = req.headers; 
    const { reportId } = req.params;
    const { isOptedIn } = req.body;
    await providerMetricsService.updateOptedInStatus( { reportId, headerOptions:{Authorization}, userInfo, isOptedIn });
    return res.status(204).send();
  } catch (error) {
    logger.error("market average get Report Controller API:", error);
    return res.status(400).send(error);
  }
}
module.exports = {
  getProviderMetrics,
  updateOptedInStatus
};
