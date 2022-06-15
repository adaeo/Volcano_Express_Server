const express = require("express");
const router = express.Router();

/* Exceptions */
function BadRequest(message) {
  this.message = message;
  this.status = 400;
}

/* GET countries listing. */
router.get("/", async function (req, res, next) {
  try {
    // If there are params in query, throw
    if (Object.keys(req.query).length !== 0) {
      console.log(req.query);
      throw new BadRequest(
        "Invalid query parameters. Query parameters are not permitted."
      );
    }

    let rows = req.db
      .distinct()
      .from("Data")
      .pluck("country")
      .orderBy("country", "asc");
    res.status(200);
    res.json(await rows);
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
