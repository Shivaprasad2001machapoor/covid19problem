const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const secretKey = "shivaprasadnomulahello"; // Replace with a secure secret key

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//API TO LOGIN

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, secretKey);
      response.send({ jwtToken });
      response.status(200);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Authentication Middleware
const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    res.status(401).json("Invalid JWT Token");
    return;
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json("Invalid JWT Token");
  }
};

//API 2

app.get("/states/", (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, secretKey, async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        const getStatesQuery = `
            SELECT
              *
            FROM
            state`;
        const staesArray = await db.all(getStatesQuery);
        response.send(statesArray);
      }
    });
  }
});

// API 3: Get State by State ID
app.get("/states/:stateId", authenticateUser, async (req, res) => {
  const { stateId } = req.params;
  const selectStateQuery = "SELECT * FROM state WHERE state_id = ?";
  const state = await db.get(selectStateQuery, [stateId]);
  if (!state) {
    res.status(404).json("State not found");
    return;
  }
  res.json(state);
});

// API 4: Create District
app.post("/districts", authenticateUser, async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;

  const createDistrictQuery = `
    INSERT INTO district
    (district_name, state_id, cases, cured, active, deaths)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  await db.run(createDistrictQuery, [
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  ]);

  res.json("District Successfully Added");
});

// API 5: Get District by District ID
app.get("/districts/:districtId", authenticateUser, async (req, res) => {
  const { districtId } = req.params;
  const selectDistrictQuery = "SELECT * FROM district WHERE district_id = ?";
  const district = await db.get(selectDistrictQuery, [districtId]);
  if (!district) {
    res.status(404).json("District not found");
    return;
  }
  res.json(district);
});

module.exports = app;
