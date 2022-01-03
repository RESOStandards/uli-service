const express = require("express");
const { authorizationMiddleware } = require("./middleware/authorization");
const router = express.Router();

const api = require("./api");
const root = require("./root");

router.use("/api/v1", authorizationMiddleware, api);

router.use("*", root);

module.exports = router;
