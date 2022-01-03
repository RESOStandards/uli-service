module.exports = {
  env: process.env.NODE_ENV || "development",
  host: process.env.SERVER_HOST || "localhost",
  envConfig:
    process.env.NODE_ENV !== "test" &&
    require(`./${process.env.NODE_ENV || "development"}`),
};
