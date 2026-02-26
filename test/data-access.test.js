"use strict";
const { expect } = require("chai");
const sinon = require("sinon");
const { ULI_TEMPLATE, ULI_SERVICE_INDEX_NAME } = require("../api/services/const");

const ES_URL = "http://localhost:9200";

const mockFetchResponse = ({ status = 200, ok = true, json, headers = {} } = {}) => {
  return Promise.resolve({
    status,
    ok,
    json: () => Promise.resolve(json),
    headers: new Map(Object.entries(headers)),
  });
};

describe("data-access", () => {
  let search, ingest, indexExists;
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, "fetch");

    // Re-require to get fresh module with stubbed fetch
    delete require.cache[require.resolve("../api/services/data-access")];
    ({ search, ingest, indexExists } = require("../api/services/data-access"));
  });

  afterEach(() => {
    sinon.restore();
  });

  // -------------------------------------------------------
  // indexExists
  // -------------------------------------------------------
  describe("indexExists", () => {
    it("should return true when ES responds with 200", async () => {
      fetchStub.resolves({ status: 200 });

      const result = await indexExists("uli-service");

      expect(result).to.equal(true);

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal(`${ES_URL}/uli-service`);
      expect(options.method).to.equal("HEAD");
    });

    it("should return false when ES responds with 404", async () => {
      fetchStub.resolves({ status: 404 });

      const result = await indexExists("uli-service");

      expect(result).to.equal(false);
    });

    it("should return false when fetch throws", async () => {
      fetchStub.rejects(new Error("connection refused"));

      const result = await indexExists("uli-service");

      expect(result).to.equal(false);
    });
  });

  // -------------------------------------------------------
  // search – single licensee, subset of fields (SEARCH.md scenario 1)
  // -------------------------------------------------------
  describe("search – single licensee with subset of fields", () => {
    it("should build a function_score query and return hits", async () => {
      const mockHits = {
        total: { value: 1 },
        hits: [
          {
            _id: "abc123",
            _source: {
              MemberFullName: "John William Smith",
              UniqueLicenseeIdentifier: "ULI-001",
            },
          },
        ],
      };

      fetchStub.callsFake(() => mockFetchResponse({ json: { hits: mockHits } }));

      const fieldValues = [
        { fieldName: "MemberFullName", value: "John William Smith" },
        { fieldName: "MemberNationalAssociationId", value: "123457" },
        { fieldName: "MemberStateLicense", value: "45620" },
        { fieldName: "MemberStateLicenseType", value: "10" },
      ];

      const result = await search(fieldValues);

      expect(result).to.deep.equal(mockHits);
      expect(fetchStub.calledOnce).to.equal(true);

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal(`${ES_URL}/${ULI_SERVICE_INDEX_NAME}/_search`);

      const body = JSON.parse(options.body);
      const query = body.query.function_score;
      expect(query.functions).to.be.an("array").with.lengthOf(4);
      expect(query.score_mode).to.equal("sum");
      expect(query.boost_mode).to.equal("multiply");
      expect(query.min_score).to.equal(2);
    });

    it("should return empty array when fetch throws", async () => {
      fetchStub.rejects(new Error("search failed"));

      const result = await search([
        { fieldName: "MemberFullName", value: "John" },
      ]);

      expect(result).to.deep.equal([]);
    });

    it("should return empty array when response is not ok", async () => {
      fetchStub.callsFake(() => mockFetchResponse({ status: 500, ok: false }));

      const result = await search([
        { fieldName: "MemberFullName", value: "John" },
      ]);

      expect(result).to.deep.equal([]);
    });

    it("should return empty array when called with no field values", async () => {
      fetchStub.callsFake(() => mockFetchResponse({ json: {} }));

      const result = await search();

      expect(result).to.deep.equal([]);
    });
  });

  // -------------------------------------------------------
  // search – single licensee, all fields (SEARCH.md scenario 2)
  // -------------------------------------------------------
  describe("search – single licensee with all fields", () => {
    it("should include filters only for fields with non-empty values", async () => {
      fetchStub.callsFake(() =>
        mockFetchResponse({ json: { hits: { total: { value: 0 }, hits: [] } } })
      );

      const fieldValues = [
        { fieldName: "MemberFullName", value: "Jane Doe" },
        { fieldName: "MemberLastName", value: "" },
        { fieldName: "MemberFirstName", value: "" },
        { fieldName: "MemberMiddleInitial", value: "" },
        { fieldName: "MemberNickname", value: "" },
        { fieldName: "MemberType", value: "" },
        { fieldName: "MemberNationalAssociationId", value: "999888" },
        { fieldName: "MemberStateLicense", value: "" },
        { fieldName: "MemberStateLicenseType", value: "" },
        { fieldName: "MemberStateLicenseState", value: "" },
        { fieldName: "MemberMlsId", value: "" },
        { fieldName: "OfficeName", value: "" },
        { fieldName: "OfficeMlsId", value: "" },
        { fieldName: "SourceSystemID", value: "" },
        { fieldName: "SourceSystemName", value: "" },
        { fieldName: "OriginatingSystemID", value: "" },
        { fieldName: "OriginatingSystemName", value: "" },
      ];

      await search(fieldValues);

      const body = JSON.parse(fetchStub.firstCall.args[1].body);
      const query = body.query.function_score;
      // Only MemberFullName and MemberNationalAssociationId have values
      expect(query.functions).to.have.lengthOf(2);
    });

    it("should include all fields when every field has a value", async () => {
      fetchStub.callsFake(() =>
        mockFetchResponse({ json: { hits: { total: { value: 0 }, hits: [] } } })
      );

      const allFields = Object.keys(ULI_TEMPLATE);
      const fieldValues = allFields.map(fieldName => ({
        fieldName,
        value: "test-value",
      }));

      await search(fieldValues);

      const body = JSON.parse(fetchStub.firstCall.args[1].body);
      const query = body.query.function_score;
      expect(query.functions).to.have.lengthOf(allFields.length);
    });
  });

  // -------------------------------------------------------
  // search – explain mode
  // -------------------------------------------------------
  describe("search – explain parameter", () => {
    it("should pass explain=true to the ES query", async () => {
      fetchStub.callsFake(() => mockFetchResponse({ json: { hits: [] } }));

      await search(
        [{ fieldName: "MemberFullName", value: "John" }],
        true
      );

      const body = JSON.parse(fetchStub.firstCall.args[1].body);
      expect(body.explain).to.equal(true);
    });

    it("should default explain to false", async () => {
      fetchStub.callsFake(() => mockFetchResponse({ json: { hits: [] } }));

      await search([{ fieldName: "MemberFullName", value: "John" }]);

      const body = JSON.parse(fetchStub.firstCall.args[1].body);
      expect(body.explain).to.equal(false);
    });
  });

  // -------------------------------------------------------
  // ingest
  // -------------------------------------------------------
  describe("ingest", () => {
    it("should POST ndjson bulk data to ES", async () => {
      const mockBody = { items: [], errors: false };
      fetchStub.callsFake(() => mockFetchResponse({ json: mockBody }));

      const licensees = [
        { MemberFullName: "John Smith", MemberStateLicense: "45620" },
        { MemberFullName: "Jane Doe", MemberStateLicense: "78901" },
      ];

      const result = await ingest("provider-123", licensees);

      expect(result).to.deep.equal(mockBody);
      expect(fetchStub.calledOnce).to.equal(true);

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal(`${ES_URL}/${ULI_SERVICE_INDEX_NAME}/_bulk`);
      expect(options.method).to.equal("POST");
      expect(options.headers["Content-Type"]).to.equal("application/x-ndjson");

      // Verify ndjson format: alternating index/doc lines
      const lines = options.body.trim().split("\n");
      expect(lines).to.have.lengthOf(4); // 2 index lines + 2 doc lines
      expect(JSON.parse(lines[0])).to.deep.equal({ index: {} });

      const doc1 = JSON.parse(lines[1]);
      expect(doc1.MemberFullName).to.equal("John Smith");
      expect(doc1.providerUoi).to.equal("provider-123");
      expect(doc1.status).to.equal("unprocessed");
      expect(doc1).to.have.property("ingestTimestamp");
    });

    it("should return empty array when response is not ok", async () => {
      fetchStub.callsFake(() => mockFetchResponse({ status: 500, ok: false }));

      const result = await ingest("provider-123", [
        { MemberFullName: "John" },
      ]);

      expect(result).to.deep.equal([]);
    });

    it("should return empty array when uliData is empty", async () => {
      const result = await ingest("provider-123", []);

      expect(result).to.deep.equal([]);
      expect(fetchStub.called).to.equal(false);
    });

    it("should return empty array when uliData is not provided", async () => {
      const result = await ingest("provider-123");

      expect(result).to.deep.equal([]);
      expect(fetchStub.called).to.equal(false);
    });

    it("should return empty array when fetch throws", async () => {
      fetchStub.rejects(new Error("bulk ingest failed"));

      const result = await ingest("provider-123", [
        { MemberFullName: "John" },
      ]);

      expect(result).to.deep.equal([]);
    });
  });
});
