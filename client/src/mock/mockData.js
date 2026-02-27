import { getMatchedFields, calculateConfidence, buildCorpusStats } from '../utils/scoring';

export const MOCK_LICENSEES = [
  {
    _id: 'es-001',
    _source: {
      UniqueLicenseeIdentifier: 'urn:reso:uli:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      providerUoi: 'M0000033',
      MemberFullName: 'John William Smith',
      MemberLastName: 'Smith',
      MemberFirstName: 'John',
      MemberMiddleInitial: 'W',
      MemberNickname: 'Johnny',
      MemberType: 'Broker',
      MemberNationalAssociationId: '123456789',
      MemberStateLicense: 'RE-45620',
      MemberStateLicenseType: 'Broker',
      MemberStateLicenseState: 'CA',
      MemberMlsId: 'MLS-001234',
      OfficeName: 'Smith Realty Group',
      OfficeMlsId: 'OFF-5678',
      SourceSystemID: 'CRMLS',
      SourceSystemName: 'California Regional MLS',
      OriginatingSystemID: 'CRMLS-ORIG',
      OriginatingSystemName: 'CRMLS Originating',
    },
  },
  {
    _id: 'es-002',
    _source: {
      UniqueLicenseeIdentifier: 'urn:reso:uli:b2c3d4e5-f6a7-8901-bcde-f12345678901',
      providerUoi: 'M0000044',
      MemberFullName: 'Jon W. Smith',
      MemberLastName: 'Smith',
      MemberFirstName: 'Jon',
      MemberMiddleInitial: 'W',
      MemberNickname: 'Jon',
      MemberType: 'Agent',
      MemberNationalAssociationId: '123456789',
      MemberStateLicense: 'RE-45620',
      MemberStateLicenseType: 'Salesperson',
      MemberStateLicenseState: 'CA',
      MemberMlsId: 'MLS-009876',
      OfficeName: 'Smith Realty Group',
      OfficeMlsId: 'OFF-5678',
      SourceSystemID: 'BAREIS',
      SourceSystemName: 'Bay Area Real Estate Info Services',
      OriginatingSystemID: 'BAREIS-ORIG',
      OriginatingSystemName: 'BAREIS Originating',
    },
  },
  {
    _id: 'es-003',
    _source: {
      UniqueLicenseeIdentifier: 'urn:reso:uli:c3d4e5f6-a7b8-9012-cdef-123456789012',
      providerUoi: 'M0000055',
      MemberFullName: 'Jane Marie Doe',
      MemberLastName: 'Doe',
      MemberFirstName: 'Jane',
      MemberMiddleInitial: 'M',
      MemberNickname: '',
      MemberType: 'Agent',
      MemberNationalAssociationId: '987654321',
      MemberStateLicense: 'RE-78901',
      MemberStateLicenseType: 'Salesperson',
      MemberStateLicenseState: 'TX',
      MemberMlsId: 'MLS-005678',
      OfficeName: 'Doe Properties LLC',
      OfficeMlsId: 'OFF-1234',
      SourceSystemID: 'HAR',
      SourceSystemName: 'Houston Assoc. of Realtors',
      OriginatingSystemID: 'HAR-ORIG',
      OriginatingSystemName: 'HAR Originating',
    },
  },
  {
    _id: 'es-004',
    _source: {
      UniqueLicenseeIdentifier: 'urn:reso:uli:d4e5f6a7-b8c9-0123-defa-234567890123',
      providerUoi: 'M0000033',
      MemberFullName: 'Robert James Johnson',
      MemberLastName: 'Johnson',
      MemberFirstName: 'Robert',
      MemberMiddleInitial: 'J',
      MemberNickname: 'Bob',
      MemberType: 'Broker',
      MemberNationalAssociationId: '456789012',
      MemberStateLicense: 'RE-11223',
      MemberStateLicenseType: 'Broker',
      MemberStateLicenseState: 'FL',
      MemberMlsId: 'MLS-003344',
      OfficeName: 'Johnson & Associates',
      OfficeMlsId: 'OFF-9012',
      SourceSystemID: 'SFAR',
      SourceSystemName: 'South Florida Assoc. of Realtors',
      OriginatingSystemID: 'SFAR-ORIG',
      OriginatingSystemName: 'SFAR Originating',
    },
  },
  {
    _id: 'es-005',
    _source: {
      UniqueLicenseeIdentifier: 'urn:reso:uli:e5f6a7b8-c9d0-1234-efab-345678901234',
      providerUoi: 'M0000066',
      MemberFullName: 'Maria Elena Garcia',
      MemberLastName: 'Garcia',
      MemberFirstName: 'Maria',
      MemberMiddleInitial: 'E',
      MemberNickname: '',
      MemberType: 'Agent',
      MemberNationalAssociationId: '567890123',
      MemberStateLicense: 'RE-44556',
      MemberStateLicenseType: 'Salesperson',
      MemberStateLicenseState: 'AZ',
      MemberMlsId: 'MLS-007788',
      OfficeName: 'Desert Sun Realty',
      OfficeMlsId: 'OFF-3456',
      SourceSystemID: 'ARMLS',
      SourceSystemName: 'Arizona Regional MLS',
      OriginatingSystemID: 'ARMLS-ORIG',
      OriginatingSystemName: 'ARMLS Originating',
    },
  },
  {
    _id: 'es-006',
    _source: {
      UniqueLicenseeIdentifier: 'urn:reso:uli:f6a7b8c9-d0e1-2345-fabc-456789012345',
      providerUoi: 'M0000044',
      MemberFullName: 'John W Smith',
      MemberLastName: 'Smith',
      MemberFirstName: 'John',
      MemberMiddleInitial: 'W',
      MemberNickname: 'John',
      MemberType: 'Broker',
      MemberNationalAssociationId: '123456789',
      MemberStateLicense: 'RE-45620',
      MemberStateLicenseType: 'Broker',
      MemberStateLicenseState: 'CA',
      MemberMlsId: 'MLS-001234',
      OfficeName: 'Pacific Coast Realty',
      OfficeMlsId: 'OFF-7890',
      SourceSystemID: 'CRMLS',
      SourceSystemName: 'California Regional MLS',
      OriginatingSystemID: 'CRMLS-ORIG',
      OriginatingSystemName: 'CRMLS Originating',
    },
  },
];

export const MOCK_DASHBOARD = {
  newMatchesCount: 12,
  reports: {
    totalUlisCreated: 1547,
    matchesConfirmedThisWeek: 23,
    conflictsPending: 8,
  },
  actionItems: [
    { id: 'conflict-001', type: 'resolve', description: 'New match found for John Smith (M0000033 vs M0000044)', timestamp: '2024-03-01T09:00:00Z' },
    { id: 'conflict-002', type: 'resolve', description: 'Potential duplicate: Jane Doe across HAR and CRMLS', timestamp: '2024-03-01T08:30:00Z' },
    { id: 'conflict-003', type: 'review', description: 'Robert Johnson license type mismatch detected', timestamp: '2024-02-28T16:45:00Z' },
    { id: 'conflict-004', type: 'resolve', description: 'Maria Garcia record updated by ARMLS — review required', timestamp: '2024-02-28T14:20:00Z' },
    { id: 'conflict-005', type: 'review', description: 'New data ingested from SFAR — 3 potential matches', timestamp: '2024-02-27T11:00:00Z' },
  ],
};

export const MOCK_CONFLICTS = {
  'conflict-001': {
    id: 'conflict-001',
    existing: MOCK_LICENSEES[0],
    incoming: MOCK_LICENSEES[1],
    reason: 'Matching National Association ID and State License across different providers',
  },
  'conflict-002': {
    id: 'conflict-002',
    existing: MOCK_LICENSEES[2],
    incoming: { ...MOCK_LICENSEES[2], _id: 'es-007', _source: { ...MOCK_LICENSEES[2]._source, SourceSystemID: 'CRMLS', SourceSystemName: 'California Regional MLS', OfficeName: 'Doe & Associates' } },
    reason: 'Same licensee found in new data feed with different office name',
  },
};

export const createMockSearchResponse = (searchFields) => {
  const corpusStats = buildCorpusStats(MOCK_LICENSEES);

  const results = MOCK_LICENSEES.map((licensee) => {
    const { matched, unmatched } = getMatchedFields(searchFields, licensee._source);
    const confidence = calculateConfidence(searchFields, licensee, corpusStats);
    return { ...licensee, matchedFields: matched, unmatchedFields: unmatched, confidence };
  }).filter(({ confidence }) => confidence > 0);

  results.sort((a, b) => b.confidence - a.confidence);
  return { hits: { total: { value: results.length }, hits: results } };
};
