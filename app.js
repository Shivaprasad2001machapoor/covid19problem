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
      const jwtToken = jwt.sign(payload, "hsgdiedosjd");
      response.send({ jwtToken });
      response.status(200);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Authentication Middleware
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "hsgdiedosjd", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//chnage format

const convertDirectorDbObjectToResponseObject = (eachState) => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  };
};

const convertDirectorDistrictToResponseObject = (eachDistrict) => {
  return {
    districtName: eachDistrict.district_name,
    stateId: eachDistrict.state_id,
    cases: eachDistrict.cases,
    cured: eachDistrict.cured,
    active: eachDistrict.active,
    deaths: eachDistrict.deaths,
  };
};

const convertDirectorDistrictsToResponseObject = (eachDistrict) => {
  return {
    districtId: eachDistrict.district_id,
    districtName: eachDistrict.district_name,
    stateId: eachDistrict.state_id,
    cases: eachDistrict.cases,
    cured: eachDistrict.cured,
    active: eachDistrict.active,
    deaths: eachDistrict.deaths,
  };
};

//API 2

app.get("/states/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
            SELECT
              *
            FROM
            state`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertDirectorDbObjectToResponseObject(eachState)
    )
  );
});

//API 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
            SELECT
              *
            FROM
              state
            WHERE 
              state_id= ${stateId};`;
  const stateArray = await db.get(getStateQuery);
  response.send(convertDirectorDbObjectToResponseObject(stateArray));
});

//API 4

app.get("/districts/", authenticateToken, async (request, response) => {
  const getDistrictsQuery = `
            SELECT
              *
            FROM
            district`;
  const districtsArray = await db.all(getDistrictsQuery);
  response.send(
    districtsArray.map((eachDistrict) =>
      convertDirectorDistrictToResponseObject(eachDistrict)
    )
  );
});

//API 4

app.post("/districts/", authenticateToken, async (request, response) => {
  const distDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = bookDetails;
  const addDistQuery = `
    INSERT INTO
      book (district_name,state_id,cases,cured,active,deaths)
    VALUES
      (
        '${districtName}',
         ${authorId},
         ${cases},
         ${cured},
         ${active},
         ${deaths},
      );`;

  const dbResponse = await db.run(addDistQuery);
  const DistId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//API 5

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
            SELECT
              *
            FROM
              district
            WHERE 
              district_id= ${districtId};`;
    const districtArray = await db.get(getDistrictQuery);
    response.send(convertDirectorDistrictsToResponseObject(districtArray));
  }
);

//API 6

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

//API -7

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtDetails = request.body;
    const {
      district_name,
      state_id,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const updateDistrictQuery = `
    UPDATE
      district
    SET
      districtName='${district_name}',
      stateId=${state_id},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths=${deaths},
    WHERE
      district_id = ${districtId};`;
    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

//API 8

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateQuery = `
            SELECT
              *
            FROM
              state
            WHERE 
              state_id= ${stateId};`;
    const stateArray = await db.get(getStateQuery);
    response.send(convertDirectorDbObjectToResponseObject(stateArray));
  }
);

module.exports = app;
