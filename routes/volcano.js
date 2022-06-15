const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");

/* Exceptions */
function BadRequest(message) {
  this.message = message;
  this.status = 400;
}

function NotFound(message) {
  this.message = message;
  this.status = 404;
}

function Unauthorized(message) {
  this.message = message;
  this.status = 401;
}

// Check authorization headers
const authorize = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    let token = null;

    // If no authorization header
    if (!authorization) {
      // Set no authorization
      res.locals.auth = null;
      next();
    } else {
      // Retrieve token
      if (authorization.split(" ").length == 2) {
        token = authorization.split(" ")[1];
      } else {
        throw new Unauthorized("Authorization header is malformed");
      }

      // Verify Token
      const decoded = jwt.verify(token, process.env.SECRET_KEY);

      if (decoded.exp < Date.now()) {
        throw new Unauthorized("JWT token has expired");
      }

      // Set authorization
      res.locals.auth = decoded;
      next();
    }
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      let message = "Invalid JWT token";
      console.log(message);
      res.status(401);
      res.json({
        error: true,
        message: message,
      });
    } else {
      console.log(err.message);
      res.status(err.status);
      res.json({
        error: true,
        message: err.message,
      });
    }
  }
};

/* GET volcanoes listing. */
router.get("/:id", authorize, async function (req, res, next) {
  try {
    // If given parameter is not a number
    if (isNaN(req.params.id)) {
      throw new BadRequest(
        "Invalid query parameters. Query parameters are not permitted"
      );
    }
    // If there are params in query, throw
    if (Object.keys(req.query).length !== 0) {
      console.log(req.query);
      throw new BadRequest(
        "Invalid query parameters. Query parameters are not permitted."
      );
    }

    let rows = null;
    if (await res.locals.auth) {
      console.log("Retrieve volcano with auth");

      rows = await req.db
        .from("data")
        .select(
          "id",
          "name",
          "country",
          "region",
          "subregion",
          "last_eruption",
          "summit",
          "elevation",
          "latitude",
          "longitude",
          "population_5km",
          "population_10km",
          "population_30km",
          "population_100km"
        )
        .where("id", "=", req.params.id);
    } else {
      console.log("Retrieve volcano without auth");

      rows = await req.db
        .from("Data")
        .select(
          "id",
          "name",
          "country",
          "region",
          "subregion",
          "last_eruption",
          "summit",
          "elevation",
          "latitude",
          "longitude"
        )
        .where("id", "=", req.params.id);
    }

    if (rows.length === 0) {
      throw new NotFound(`Volcano with ID: ${req.params.id} not found`);
    }

    res.status(200).json(await rows[0]);

  } catch (err) {
    console.log(err.message);
    res.status(err.status);
    res.json({
      error: true,
      message: err.message,
    });
  }
});

module.exports = router;
