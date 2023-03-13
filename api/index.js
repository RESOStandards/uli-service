const express = require("express");
const app = express();
const { search, ingest, indexExists } = require("./services/data-access");
const { ULI_SERVICE_INDEX_NAME } = require("./services/const");
const { generateUli } = require("./utils");
const { faker } = require('@faker-js/faker');
const port = 3000;

app.use(express.json({ limit: "2000mb" }));
app.use(express.urlencoded({ extended: false, limit: "2000mb" }));

app.listen(port, async () => {
  console.log(`ULI Service started! Listening on port ${port}...`);
});

app.get("/", async (req, res) => {
  res.send({
    statusCode: 200,
    message: "It worked!!",
  });
});

app.get("/uli-service/v1/:providerUoi/generate-test-data/:numRecords", async (req, res) => {
  const { params } = req;
  const { providerUoi, numRecords } = params;

  if (!providerUoi?.length) {
    res.send({
      statusCode: 400,
      message: "Missing providerUoi in path!",
    });
  }

  if (isNaN(numRecords) || numRecords < 1) {
    res.send({
      statusCode: 400,
      message: "Missing numRecords in path!",
    });
  }

  var fakeData = [];

  const memberTypes = ["Agent", "Broker", "Office Manager", "Appraiser", "Photographer", "Assistant", "MLO", "Realtor", "Association Staff", "MLS Staff", "Other"];
  const licenseTypes = ["Agent", "Broker"];

  const mlsId = faker.random.numeric(8);

  for (let index = 0; index < numRecords; index++) {
    var name = faker.name.firstName() + " " + faker.name.lastName();
    var middleName = faker.name.middleName();

    fakeData[index] = {
      MemberFullName: name,
      MemberLastName: name.split(" ")[1],
      MemberFirstName: name.split(" ")[0],
      MemberMiddleInitial: middleName.charAt(0),
      MemberNickname: middleName,
      MemberType: faker.helpers.arrayElement(memberTypes),
      MemberNationalAssociationId: faker.random.numeric(6),
      MemberStateLicense: faker.random.numeric(6),
      MemberStateLicenseType: faker.helpers.arrayElement(licenseTypes),
      MemberStateLicenseState: faker.address.state(),
      MemberMlsId: mlsId,
      OfficeName: faker.company.name(),
      OfficeMlsId: faker.random.numeric(4)
    };
  }

  res.send({
    statusCode: 200,
    body: {
      fakeData,
    },
  });
});

app.post("/uli-service/v1/ingest/:providerUoi", async (req, res) => {
  try {
    const { body: licensees = [], params } = req;
    const { providerUoi } = params;

    if (!providerUoi?.length) {
      res.send({
        statusCode: 400,
        message: "Missing providerUoi in path!",
      });
    }

    if (!licensees?.length) {
      res.send({
        statusCode: 400,
        message: "Request body missing ULI array!",
      });
    }

    const processed = [];
    const [firstLicensee, ...remainingLicensees] = licensees;

    let newIndexCreated = false;

    //ensure the index exists and, if not, create it with the first record
    //insert first record if index doesn't exist
    if (!(await indexExists(ULI_SERVICE_INDEX_NAME))) {
      console.log(
        `ULI Service Index '${ULI_SERVICE_INDEX_NAME}' does not exist! Creating...`
      );
      const uli = generateUli();
      processed.push({ ...firstLicensee, UniqueLicenseeIdentifier: uli });
      await ingest(providerUoi, processed);
      console.log(`New ULI assigned! uli: '${uli}'\n`);
      newIndexCreated = true;
    }

    const licenseesToProcess = newIndexCreated ? remainingLicensees || [] : licensees;

    //run search and scoring methodology on remaining licensees
    for await (const licensee of licenseesToProcess) {
      const query = Object.entries(licensee).map(([fieldName, value]) => {
        return { fieldName, value };
      });

      const results = (await search(query))?.hits || [];

      if (!results?.length) {
        const uli = generateUli();
        //assign ULI
        processed.push({
          ...licensee,
          UniqueLicenseeIdentifier: uli,
        });

        console.log(`New ULI assigned! uli: '${uli}'\n`);
      } else {
        const potentialMatches = results.map(({ _id: id, _source: data }) => {
          return {
            id,
            UniqueLicenseeIdentifier:
              data?.UniqueLicenseeIdentifier || "UNASSIGNED",
          };
        });

        processed.push({
          ...licensee,
          potentialMatches,
        });

        console.log(`Potential matches: ${potentialMatches?.length || 0}\n`);
      }
    }

    res.send({
      statusCode: 200,
      body: {
        processed,
      },
    });
  } catch (err) {
    console.log(err);
    res.send({
      statusCode: 400,
      message: err,
    });
  }
});

app.post("/uli-service/v1/search", async (req, res) => {
  try {
    const { explain = false } = req?.query;

    res.send({
      statusCode: 200,
      body: await search(req?.body, explain),
    });
  } catch (err) {
    console.error(err);

    res.send({
      statusCode: 400,
      message: `Error! Message: ${err}`,
    });
  }
});
