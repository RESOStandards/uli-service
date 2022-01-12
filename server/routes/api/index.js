const express = require("express");
const router = express.Router();
const authentication = require("./authentication");
const tokenManagement = require("./tokenManagement");
const user = require("./user");
const organization = require("./organization");
const certification = require("./certification");

router.use("/account", authentication);
router.use("/token", tokenManagement);
router.use("/user", user);
router.use("/organization", organization);
router.use("/certification", certification);

module.exports = router;
