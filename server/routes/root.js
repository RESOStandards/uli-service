const express = require("express");
const router = express.Router();

const rootController = require("controllers/root");

/* GET home page. */
router.get("/", rootController.index);

module.exports = router;
