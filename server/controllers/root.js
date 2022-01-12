const config = require("config");
const assetJson = require("../../assets.json");

module.exports.index = (req, res) => {
  const assetPrefix =
    config.env == "development"
      ? `http://${config.host}:5678/`
      : "/public/dist/";
  res.render("index", {
    config: { bundlePath: assetPrefix + assetJson.main.js },
  });
};
