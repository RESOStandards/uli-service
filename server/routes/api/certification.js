const express = require("express");
const router = express.Router();
const certificationController = require("controllers/api/certification");

router.get("/terms", certificationController.getTerms);

module.exports = router;
