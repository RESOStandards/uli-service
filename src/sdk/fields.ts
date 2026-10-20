/**
 * The ULI fields of section 2.3: seventeen PII-safe Member Resource fields, and
 * the field that carries the resolved identifier.
 *
 * Spelled out rather than discovered, because the matching engine, the RCF
 * payload check and the ingest mapping all have to agree on the same set, and
 * the 2022 client carried `MemberMiddleInitial`, which is not a Data Dictionary
 * field. The Data Dictionary name is `MemberMiddleName`, which section 2.3 uses.
 */

export const ULI_FIELDS = [
  'MemberFullName',
  'MemberFirstName',
  'MemberMiddleName',
  'MemberLastName',
  'MemberNickname',
  'MemberType',
  'MemberNationalAssociationId',
  'MemberStateLicense',
  'MemberStateLicenseState',
  'MemberStateLicenseType',
  'MemberMlsId',
  'OfficeMlsId',
  'OfficeName',
  'SourceSystemID',
  'SourceSystemName',
  'OriginatingSystemID',
  'OriginatingSystemName',
] as const;

export type UliField = (typeof ULI_FIELDS)[number];

/** Section 2.3: the resolved identifier rides in the Member Resource's existing field. */
export const ULI_IDENTIFIER_FIELD = 'UniqueLicenseeIdentifier';

/** A licensee record as the engine sees it: any subset of the ULI fields. */
export type LicenseeRecord = Readonly<Record<string, unknown>>;

export const isUliField = (name: string): name is UliField =>
  (ULI_FIELDS as readonly string[]).includes(name);

/** Keep only the ULI fields (and the identifier) of a record, in canonical order. */
export const uliSubset = (record: LicenseeRecord): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    [...ULI_FIELDS, ULI_IDENTIFIER_FIELD]
      .filter((f) => record[f] !== undefined && record[f] !== null && record[f] !== '')
      .map((f) => [f, record[f]])
  );
