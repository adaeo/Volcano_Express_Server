const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const swaggerUI = require("swagger-ui-express");
const swaggerDoc = require("./docs/swagger.json");
const helmet = require("helmet");

const options = require("./knexfile.js");
const knex = require("knex")(options);

const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const countriesRouter = require("./routes/countries");
const volcanoesRouter = require("./routes/volcanoes");
const volcanoRouter = require("./routes/volcano");
const meRouter = require("./routes/me");

require("dotenv").config();

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(helmet());
app.use(logger("combined"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

logger.token("res", (req, res) => {
  const headers = {};
  res.getHeaderNames().map((h) => (headers[h] = res.getHeader(h)));
  return JSON.stringify(headers);
});

// Connect to db
app.use((req, res, next) => {
  req.db = knex;
  next();
});

app.use("/", swaggerUI.serve);
app.get(
  "/",
  swaggerUI.setup(swaggerDoc, {
    swaggerOptions: { defaultModelsExpandDepth: -1 }, // Hide schema section
  })
);

app.use("/user", userRouter);
app.use("/countries", countriesRouter);
app.use("/volcanoes", volcanoesRouter);
app.use("/volcano", volcanoRouter);
app.use("/me", meRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
