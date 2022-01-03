const express = require("express");
const router = express.Router();
const { celebrate, Joi, Segments } = require("celebrate");

const userController = require("controllers/api/user");

router.post(
  "/create",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      newUser: Joi.object().keys({
        username: Joi.string().required(),
        password: Joi.string().required(),
        full_name: Joi.string().required(),
        email: Joi.string().required(),
        metadata: Joi.object()
          .keys({
            company_name: Joi.string().optional(),
            uoi: Joi.string().optional(),
          })
          .optional(),
      }),
      isAdmin: Joi.boolean().required(),
    }),
  }),
  userController.createUser
);

router.get("/list", userController.listUsers);

router.delete(
  "/delete",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      username: Joi.string().required(),
    }),
  }),
  userController.deleteUser
);

module.exports = router;
