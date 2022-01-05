const logger = require("logger");
const organizationService = require("services/organization");

const getAllOrganizations = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    const organizations = await organizationService.searchOrganizationsWithNameandUoi(
      {
        from: 0,
        size: 10000,
      },
      { Authorization }
    );
    return res.send(organizations);
  } catch (error) {
    logger.error("Fetch Organization Info Controller API: ", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

const getOrganization = async (req, res) => {
  try {
    let { uoi } = req.query;
    const { Authorization } = req.headers;
    const organization = await organizationService.getOrganization(uoi, {
      Authorization,
    });
    return res.send(organization);
  } catch (error) {
    logger.error("Fetch Organization Info Controller API: ", error);
    return res
      .status(error?.code || 400)
      .send({ message: error?.message || error });
  }
};

const syncOrganization = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    await organizationService.syncOrganization({ Authorization });
    return res.send({ success: true });
  } catch (error) {
    logger.error("Sync Organization Info Controller API: ", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

module.exports = {
  getAllOrganizations,
  getOrganization,
  syncOrganization,
};
