/** Records from the specification's worked examples and the seeded index, shared by the suites. */

/** Section 2.12.1, Provider 1's licensee subset. */
export const JANE_P1 = {
  MemberFullName: 'Jane A Smith',
  MemberFirstName: 'Jane',
  MemberMiddleName: 'A',
  MemberLastName: 'Smith',
  MemberNickname: 'Janie',
  MemberType: 'REALTOR Salesperson',
  MemberNationalAssociationId: '999000111',
  MemberStateLicense: 'SL123456',
  MemberStateLicenseType: 'Salesperson',
  MemberStateLicenseState: 'CA',
  MemberMlsId: 'A0001',
  OfficeName: 'Smith Realty Group',
  OfficeMlsId: 'OFF001',
  SourceSystemID: 'M00000123',
  SourceSystemName: 'Source MLS',
  OriginatingSystemID: 'M00000123',
  OriginatingSystemName: 'Originating MLS',
} as const;

/** Section 2.12.2, Provider 8's candidate: same person, different office and MLS ID, no middle name in the full name. */
export const JANE_P8 = {
  MemberFullName: 'Jane Smith',
  MemberFirstName: 'Jane',
  MemberMiddleName: 'A',
  MemberLastName: 'Smith',
  MemberNickname: 'Janie',
  MemberType: 'REALTOR Salesperson',
  MemberNationalAssociationId: '999000111',
  MemberStateLicense: 'SL123456',
  MemberStateLicenseType: 'Salesperson',
  MemberStateLicenseState: 'CA',
  MemberMlsId: 'B7788',
  OfficeName: 'Smith Realty Group',
  OfficeMlsId: 'OFF042',
  SourceSystemID: 'M00000888',
  SourceSystemName: 'Resolver 8 MLS',
  OriginatingSystemID: 'M00000888',
  OriginatingSystemName: 'Resolver 8 MLS',
} as const;

/** Section 2.12.5, Robert Chen Jr. as onboarded, carrying Sr.'s license and NRDS. */
export const CHEN_JR_CLONED = {
  MemberFullName: 'Robert Chen Jr.',
  MemberFirstName: 'Robert',
  MemberLastName: 'Chen',
  MemberType: 'REALTOR Salesperson',
  MemberNationalAssociationId: '555000222',
  MemberStateLicense: 'SL778899',
  MemberStateLicenseType: 'Salesperson',
  MemberStateLicenseState: 'CA',
  MemberMlsId: 'J2001',
  OfficeName: 'Chen Realty',
  OfficeMlsId: 'OFF300',
} as const;

/** Sr., as Provider 8 would hold him: the same license and NRDS, his own name. */
export const CHEN_SR = {
  MemberFullName: 'Robert Chen',
  MemberFirstName: 'Robert',
  MemberLastName: 'Chen',
  MemberNationalAssociationId: '555000222',
  MemberStateLicense: 'SL778899',
  MemberStateLicenseType: 'Salesperson',
  MemberStateLicenseState: 'CA',
  OfficeName: 'Chen Realty',
  OfficeMlsId: 'OFF300',
} as const;

/** Section 2.12.5, Jr.'s corrected criteria. */
export const CHEN_JR_CORRECTED = {
  ...CHEN_JR_CLONED,
  MemberNationalAssociationId: '555000999',
  MemberStateLicense: 'SL445566',
} as const;

/** The three seeded records in `uli-members`. */
export const SEED_A1 = {
  MemberNationalAssociationId: '012345687',
  MemberFullName: 'John Smith',
  MemberFirstName: 'John',
  MemberLastName: 'Smith',
  MemberStateLicense: 'RE-884120',
  MemberStateLicenseState: 'IN',
  MemberStateLicenseType: 'Salesperson',
  MemberMlsId: 'A1001',
  OfficeName: 'Prairie Realty',
  OfficeMlsId: 'OFC-77',
  MemberType: 'Agent',
} as const;

export const SEED_B1 = {
  MemberNationalAssociationId: '012345687',
  MemberFullName: 'Johnny Smith',
  MemberFirstName: 'Johnny',
  MemberNickname: 'Johnny',
  MemberLastName: 'Smith',
  MemberStateLicense: 'RE-884120',
  MemberStateLicenseState: 'IN',
  MemberMlsId: 'B2002',
  OfficeName: 'Prairie Realty',
  OfficeMlsId: 'OFC-77',
  MemberType: 'Agent',
} as const;

export const SEED_B2 = {
  MemberFullName: 'Jane Smith',
  MemberFirstName: 'Jane',
  MemberLastName: 'Smith',
  MemberStateLicense: 'RE-990011',
  MemberStateLicenseState: 'IN',
  MemberMlsId: 'B2003',
  OfficeName: 'Lakeside Group',
  OfficeMlsId: 'OFC-91',
  MemberType: 'Agent',
} as const;

/** Section 2.8's worked example, with real reproducible values. */
export const SPEC_ULI = {
  uoi: 'urn:reso:uoi:1.0:T00000012:M00000123',
  nonce: 'nyxKF6Gyw9Re',
  signed: 'urn:reso:uli:1.0:urn:reso:uoi:1.0:T00000012:M00000123:nyxKF6Gyw9Re',
  signature: 'zByDTVoX3z7TNVgH3SVKVQCaA2RcUK7dAJK70Pu48rExxBiCGu5Sz6lhPAChBPEs-Gb3TXjEkJOspFZkDjiABg',
  uli: 'urn:reso:uli:1.0:urn:reso:uoi:1.0:T00000012:M00000123:nyxKF6Gyw9Re:zByDTVoX3z7TNVgH3SVKVQCaA2RcUK7dAJK70Pu48rExxBiCGu5Sz6lhPAChBPEs-Gb3TXjEkJOspFZkDjiABg',
  publicKey: '3F0yXARgFnOg1PnvBNs-PEsNA-I4VLafdjmlklecppw',
} as const;
