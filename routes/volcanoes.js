const express = require("express");
const router = express.Router();

/* Exceptions */
function BadRequest(message) {
  this.message = message;
  this.status = 400;
}

/* GET volcanoes listing. */
router.get("/", async function (req, res, next) {
  try {
    const req_keys = Object.keys(req.query);

    // If country is not a parameter, throw
    if (!req.query["country"]) {
      console.log(`\nMissing country parameter. Received params: ${req_keys}`);
      throw new BadRequest("country is a required query parameter.");
    }
    // If there are more than 2 params, throw
    if (req_keys.length > 2) {
      console.log(`\nLength of parameters is ${req_keys.length}`);
      throw new BadRequest(
        "Invalid query parameters. Only country and populatedWithin are permitted."
      );
    }
    // If there are any invalid params, throw
    for (const key of req_keys) {
      if (key != "country" && key != "populatedWithin") {
        console.log(`\nInvalid parameter was ${key}`);
        throw new BadRequest(
          "Invalid query parameters. Only country and populatedWithin are permitted."
        );
      }
    }

    // If populatedWithin is received
    if ("populatedWithin" in req.query) {
      // If populatedWithin has invalid arg, throw
      const validPop = ["5km", "10km", "30km", "100km"];
      if (
        !validPop.includes(req.query["populatedWithin"]) ||
        !req.query["populatedWithin"]
      ) {
        console.log(
          `\nInvalid populatedWithin arg. Received arg was ${req.query["populatedwithin"]}`
        );
        throw new BadRequest(
          "Invalid value for populatedWithin. Only: 5km,10km,30km,100km are permitted."
        );
      }

      const range = "population_" + String(req.query["populatedWithin"]);

      let rows = req.db
        .from("Data")
        .select("id", "name", "country", "region", "subregion")
        .where(range, ">", 0)
        .orderBy("id", "asc").where("country", "=", req.query["country"]);

      res.status(200).json(await rows);
    }
    // Only country parameter
    else {
      let rows = req.db
        .from("Data")
        .select("id", "name", "country", "region", "subregion")
        .orderBy("id", "asc").where("country", "=", req.query["country"]);

      res.status(200).json(await rows);
    }
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
