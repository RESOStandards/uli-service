process.env.NODE_ENV = "test";

//Require the dev-dependencies
const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../server/app");
const expect = chai.expect;

const elasticClient = require("./elasticClient");
const certificationReportsService = require("../server/services/certificationReports");
const { dataDictionaryReport } = require("./constants/dataDictionary");
const { webApiReport } = require("./constants/webApi");
const { reportTypes } = require("../server/constants/reportTypes");
const { organization } = require("./constants/organization");

// eslint-disable-next-line no-unused-vars
const should = chai.should();
chai.use(chaiHttp);

describe("CertificationReports", () => {
  let dataDictionaryId,
    webApiId = null;
  const recipientUoi = organization.uoi;
  const providerUoi = organization.uoi;

  before(async function () {
    this.timeout(0);
    await elasticClient.index({
      index: "uoi",
      id: recipientUoi,
      body: organization,
    });
    const indexExist = await elasticClient.indices.exists({
      index: "certification-report",
    });
    if (indexExist) {
      await elasticClient.indices.delete({ index: "certification-report" });
    }
    const response = await certificationReportsService.create(
      { ...dataDictionaryReport, recipientUoi, providerUoi },
      null,
      true
    );
    dataDictionaryId = response.id;

    const webApiResponse = await certificationReportsService.create(
      { ...webApiReport, recipientUoi, providerUoi },
      null,
      true
    );
    webApiId = webApiResponse.id;
  });
  /*
   * Test the /POST route
   */
  describe("/POST certification_reports", () => {
    it("it should POST a data dictionary report", async () => {
      // eslint-disable-next-line no-unused-vars
      const { type, ...ddr } = dataDictionaryReport;
      const response = await chai
        .request(app)
        .post(`/api/v1/certification_reports/data_dictionary/${providerUoi}`)
        .set("recipientuoi", recipientUoi)
        .send(ddr);
      response.should.have.status(200);
      response.body.should.be.a("object");
      response.body.should.have.property("id");
    });

    it("it should POST a web api core server report", async () => {
      // eslint-disable-next-line no-unused-vars
      const { type, ...war } = webApiReport;
      const response = await chai
        .request(app)
        .post(
          `/api/v1/certification_reports/web_api_server_core/${providerUoi}`
        )
        .set("recipientuoi", recipientUoi)
        .send(war);
      response.should.have.status(200);
      response.body.should.be.a("object");
      response.body.should.have.property("id");
    });
  });

  describe("/Get Summary Report", function () {
    it("it should get data dictionary and web api", async function () {
      const response = await chai
        .request(app)
        .get(`/api/v1/certification_reports/summary/${recipientUoi}`)
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const reports = response.body;
      reports.should.be.an("array");
      for (const report of reports) {
        expect(report.type).to.be.oneOf([
          reportTypes.DATA_DICTIONARY.name,
          reportTypes.WEB_API_SERVER_CORE.name,
        ]);
        expect(report.id).to.be.oneOf([dataDictionaryId, webApiId]);
      }
    });
  });
});
