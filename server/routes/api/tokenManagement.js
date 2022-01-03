const express = require("express");
const router = express.Router();
const { celebrate, Joi, Segments } = require("celebrate");
const tokenManagementController = require("controllers/api/tokenManagement");

router.post(
  "/create",
  celebrate({
    [Segments.QUERY]: {
      username: Joi.string().required(),
    },
  }),
  tokenManagementController.createAndAssignApiKeyForUser
);

router.post(
  "/admin/create",
  celebrate({
    [Segments.BODY]: {
      username: Joi.string().required(),
      password: Joi.string().required(),
    },
  }),
  tokenManagementController.createApiKeyForAdmin
);

router.get(
  "/admin/list",
  celebrate({
    [Segments.QUERY]: {
      username: Joi.string().required(),
    },
  }),
  tokenManagementController.listAdminApiKeys
);

router.delete(
  "/delete",
  celebrate({
    [Segments.QUERY]: {
      username: Joi.string().required(),
      tokenId: Joi.string().required(),
    },
  }),
  tokenManagementController.deleteApiKey
);

router.delete(
  "/admin/delete",
  celebrate({
    [Segments.QUERY]: {
      username: Joi.string().required(),
      tokenId: Joi.string().required(),
    },
  }),
  tokenManagementController.deleteAdminApiKey
);

module.exports = router;
