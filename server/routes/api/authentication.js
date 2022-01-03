const express = require("express");
const router = express.Router();
const { celebrate, Joi, Segments } = require("celebrate");
const authenticationController = require("controllers/api/authentication");
const {
  publicApiAuthorizationMiddleware,
} = require("../middleware/authorization");

router.post(
  "/login",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }),
  }),
  publicApiAuthorizationMiddleware,
  authenticationController.login
);

router.delete(
  "/logout",
  authenticationController.logout
);

module.exports = router;
