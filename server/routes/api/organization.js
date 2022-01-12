const express = require("express");
const router = express.Router();
const { celebrate, Joi, Segments } = require("celebrate");
const organizationController = require("controllers/api/organization");
const {
  publicApiAuthorizationMiddleware,
} = require("./../middleware/authorization");

router.get(
  "/all",
  publicApiAuthorizationMiddleware,
  organizationController.getAllOrganizations
);

router.get(
  "/",
  celebrate({
    [Segments.QUERY]: {
      uoi: Joi.string().required(),
    },
  }),
  publicApiAuthorizationMiddleware,
  organizationController.getOrganization
);

router.post("/sync", organizationController.syncOrganization);

module.exports = router;
