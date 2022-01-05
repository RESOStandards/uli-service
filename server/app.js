require("app-module-path").addPath(__dirname);
// const config = require("config");
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const { errors } = require("celebrate");
const logger = require("logger");
const mainRouter = require("./routes");

const swaggerUi = require("swagger-ui-express"),
  swaggerDocument = require("./swagger.json");

const pathfinderUI = require("pathfinder-ui");

const app = express();

if (process.env.NODE_ENV !== "production") {
  app.use(
    "/pathfinder",
    function (req, res, next) {
      pathfinderUI(app);
      next();
    },
    pathfinderUI.router
  );
}

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

logger.info("Starting server");

app.use(morgan("dev"));
app.use(express.json({ limit: "2000mb" }));
app.use(express.urlencoded({ extended: false, limit: "2000mb" }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// For serving static assets
app.use("/public", express.static(path.join(__dirname, "public")));

// For serving static assets
app.use("/assets", express.static(path.join(__dirname, "../client/assets")));

// Mounting main router
app.use(mainRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(errors());

// error handler
app.use(function (err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
