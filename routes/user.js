const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* Exceptions */
function BadRequest(message) {
  this.message = message;
  this.status = 400;
}

function Unauthorized(message) {
  this.message = message;
  this.status = 401;
}

function Forbidden(message) {
  this.message = message;
  this.status = 403;
}

function NotFound(message) {
  this.message = message;
  this.status = 404;
}

function UserExists(message) {
  this.message = message;
  this.status = 409;
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

// GET profile of email
router.get("/:email/profile", authorize, async function (req, res, next) {
  try {
    const email = req.params.email;
    // Variable specifies if viewing own profile
    let personal = false;

    // If authorized
    if (await res.locals.auth) {
      const decoded = await res.locals.auth;

      // If user emails match
      if (email == decoded.email) {
        personal = true;
      }
    }
    let rows = null;

    if (personal) {
      rows = await req.db
        .from("Profiles")
        .select("email", "firstName", "lastName", "dob", "address")
        .where("email", "=", email);
    } else {
      rows = await req.db
        .from("Profiles")
        .select("email", "firstName", "lastName")
        .where("email", "=", email);
    }

    if ((await rows.length) < 1) {
      throw new NotFound("User not found");
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

// PUT profile of email
router.put("/:email/profile", authorize, async function (req, res, next) {
  try {
    const email = req.params.email;

    // If authorized
    if (await res.locals.auth) {
      const decoded = await res.locals.auth;

      // If user emails match
      if (email == decoded.email) {
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        let dob = req.body.dob;
        const address = req.body.address;

        // If body is incomplete
        if (!firstName || !lastName || !dob || !address) {
          throw new BadRequest(
            "Request body incomplete: firstName, lastName, dob and address are required."
          );
        }

        // If not strings
        if (
          !(typeof firstName === "string") ||
          !(typeof lastName === "string") ||
          !(typeof address === "string")
        ) {
          throw new BadRequest(
            "Request body invalid: firstName, lastName and address must be strings only."
          );
        }
        
        // If is invalid date
        if (isNaN(new Date(dob)) || dob.length > 10) {
          throw new BadRequest(
            "Invalid input: dob must be a real date in format YYYY-MM-DD."
          );
        }
        else {
          const parts = dob.split("-");
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);

          // Get num days in feb for year
          const feb = year%4==0 && (year%100 || year%400==0) ? 29 : 28;

          // set max days per month
          const month_days = [0, 31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          
          if (!(month > 0 && month < 13 && day > 0 && day <= month_days[month])) {
            throw new BadRequest(
              "Invalid input: dob must be a real date in format YYYY-MM-DD."
            );
          }          
        }

        // If date is in the future
        if (Date.parse(dob) > Date.now()) {
          throw new BadRequest(
            "Invalid input: dob must be a date in the past."
          );
        }

        const update = {
          firstName: firstName,
          lastName: lastName,
          dob: dob,
          address: address,
        };

        await req.db.from("Profiles").where("email", "=", email).update(update);
        console.log("Successfully updated profile.");
        let rows = await req.db
          .from("Profiles")
          .select("email", "firstName", "lastName", "dob", "address")
          .where("email", "=", email);

        res.status(200);
        res.json(await rows[0]);

      } else {
        throw new Forbidden("Forbidden");
      }
    } else {
      throw new Unauthorized("Authorization header ('Bearer token') not found");
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

// POST register an account
router.post("/register", async function (req, res, next) {
  try {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
      throw new BadRequest(
        "Request body incomplete, both email and password are required"
      );
    }

    const queryUsers = await req.db
      .from("accounts")
      .select("*")
      .where("email", "=", email);

    if (queryUsers.length > 0) {
      throw new UserExists("User already exists");
    }

    console.log("\nNo matching users, starting salt and hash");

    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);

    // Create account
    await req.db.from("accounts").insert({ email, hash });
    // Create blank profile
    await req.db.from("profiles").insert({
      email,
      firstName: null,
      lastName: null,
      dob: null,
      address: null,
    });

    console.log("User inserted in accounts and profiles successfully");

    res.status(201).json({ error: false, message: "User Created!" });
  } catch (err) {
    console.log(err.message);
    res.status(err.status);
    res.json({
      error: true,
      message: err.message,
    });
  }
});

// POST login to an account
router.post("/login", async function (req, res, next) {
  try {
    const email = req.body.email;
    const password = req.body.password;

    // If incomplete body
    if (!email || !password) {
      throw new BadRequest(
        "Request body incomplete, both email and password are required"
      );
    }

    // query for matching email
    const queryUsers = await req.db
      .from("accounts")
      .select("*")
      .where("email", "=", email);

    // If there are no matching emails
    if (queryUsers.length === 0) {
      throw new Unauthorized("Incorrect email or password");
    }

    // Check password match
    const user = queryUsers[0];
    const match = await bcrypt.compare(password, user.hash);

    // Incorrect password
    if (!match) {
      throw new Unauthorized("Incorrect email or password");
    }

    // Set secret key
    const secretKey = process.env.SECRET_KEY;
    const expires_in = 60 * 60 * 24;
    const exp = Date.now() + expires_in * 1000;

    const token = jwt.sign({ email, exp }, secretKey);

    res.json({ token_type: "Bearer", token, expires_in });
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
