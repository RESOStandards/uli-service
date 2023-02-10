'use strict';
const { v4: uuid } = require("uuid");

const generateUli = () => `urn:reso:uli:${uuid()}`;

module.exports = {
  generateUli
};