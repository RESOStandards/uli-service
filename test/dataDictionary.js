process.env.NODE_ENV = "test";

const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;

const app = require("../server/app");
const elasticClient = require("./elasticClient");
const certificationReportsService = require("../server/services/certificationReports");
const { dataDictionaryReport } = require("./constants/dataDictionary");
const { organization } = require("./constants/organization");

chai.use(chaiHttp);

describe("DataDictionary", () => {
  let id = null;
  before(async function () {
    await elasticClient.index({
      index: "uoi",
      id: organization.uoi,
      body: organization,
    });
    const indexExist = await elasticClient.indices.exists({
      index: "certification-report",
    });
    if (indexExist) {
      await elasticClient.indices.delete({ index: "certification-report" });
    }
    const response = await certificationReportsService.create(
      { ...dataDictionaryReport, recipientUoi: organization.uoi },
      null,
      true
    );
    id = response.id;
  });

  describe("get resources", function () {
    it("it should GET all the resources of data dictionary report", async function () {
      const response = await chai
        .request(app)
        .get(`/api/v1/certification_reports/data_dictionary/${id}/resources`)
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const resources = response.body;
      resources.should.be.an("array");
      expect(resources.length).to.equal(6);
      for (const resource of resources) {
        expect(resource.doc_count).to.equal(2);
      }
    });
  });

  describe("get fields", function () {
    it("it should GET 1 field", async function () {
      const size = 1;
      const response = await chai
        .request(app)
        .get(
          `/api/v1/certification_reports/data_dictionary/${id}/fields/Property/${size}`
        )
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const resources = response.body;
      resources.should.be.an("array");
      expect(resources.length).to.equal(size);
    });
    it("it should GET 2 fields", async function () {
      const size = 2;
      const response = await chai
        .request(app)
        .get(
          `/api/v1/certification_reports/data_dictionary/${id}/fields/Property/${size}`
        )
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const resources = response.body;
      resources.should.be.an("array");
      expect(resources.length).to.equal(size);
    });
  });

  describe("search fields", function () {
    it("it should search and find appliances", async function () {
      const searchText = "ppliance";
      const response = await chai
        .request(app)
        .get(
          `/api/v1/certification_reports/data_dictionary/${id}/fields/${searchText}`
        )
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const fields = response.body;
      fields.should.be.an("array");
      let appliancesCount = 0;
      for (const field of fields) {
        expect(field.fieldName.includes(searchText)).to.equal(true);
        if (field.fieldName === "Appliances") {
          appliancesCount++;
        }
      }
      expect(appliancesCount).to.be.above(0);
    });
  });

  describe("get lookups", function () {
    it("it should GET 10 lookups", async function () {
      const size = 10;
      const lookupName = "PropertyEnums.Appliances";
      const response = await chai
        .request(app)
        .get(
          `/api/v1/certification_reports/data_dictionary/${id}/lookups/${lookupName}?from=0&size=${10}`
        )
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const lookups = response.body;
      lookups.should.be.an("array");
      expect(lookups.length).to.equal(size);
      for (const lookup of lookups) {
        expect(lookup.lookupName).to.equal(lookupName);
      }
    });
    it("it should GET 10 standard lookups", async function () {
      const size = 10;
      const lookupName = "PropertyEnums.Appliances";
      const response = await chai
        .request(app)
        .get(
          `/api/v1/certification_reports/data_dictionary/${id}/lookups/${lookupName}?from=0&size=${10}&filter=reso`
        )
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const lookups = response.body;
      lookups.should.be.an("array");
      expect(lookups.length).to.equal(size);
      for (const lookup of lookups) {
        expect(lookup.lookupName).to.equal(lookupName);
        expect(lookup.standardRESO).to.equal(true);
      }
    });
    it("it should GET 10 local lookups", async function () {
      const size = 10;
      const lookupName = "PropertyEnums.Appliances";
      const response = await chai
        .request(app)
        .get(
          `/api/v1/certification_reports/data_dictionary/${id}/lookups/${lookupName}?from=0&size=${10}&filter=local`
        )
        .set("content-type", "application/json")
        .send();
      response.should.have.status(200);
      const lookups = response.body;
      lookups.should.be.an("array");
      expect(lookups.length).to.equal(size);
      for (const lookup of lookups) {
        expect(lookup.lookupName).to.equal(lookupName);
        expect(lookup.standardRESO).to.equal(false);
      }
    });
  });
});
