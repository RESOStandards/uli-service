export const FIELD_WEIGHTS = {
  MemberFullName: 10,
  MemberLastName: 1,
  MemberFirstName: 1,
  MemberMiddleInitial: 1,
  MemberNickname: 3,
  MemberType: 3,
  MemberNationalAssociationId: 10,
  MemberStateLicense: 10,
  MemberStateLicenseType: 3,
  MemberStateLicenseState: 2,
  MemberMlsId: 5,
  OfficeName: 2,
  OfficeMlsId: 10,
  SourceSystemID: 10,
  SourceSystemName: 5,
  OriginatingSystemID: 10,
  OriginatingSystemName: 5,
};

export const FIELD_LABELS = {
  MemberFullName: 'Full Name',
  MemberLastName: 'Last Name',
  MemberFirstName: 'First Name',
  MemberMiddleInitial: 'Middle Initial',
  MemberNickname: 'Nickname',
  MemberType: 'Member Type',
  MemberNationalAssociationId: 'National Assoc. ID',
  MemberStateLicense: 'State License',
  MemberStateLicenseType: 'License Type',
  MemberStateLicenseState: 'License State',
  MemberMlsId: 'MLS ID',
  OfficeName: 'Office Name',
  OfficeMlsId: 'Office MLS ID',
  SourceSystemID: 'Source System ID',
  SourceSystemName: 'Source System Name',
  OriginatingSystemID: 'Originating System ID',
  OriginatingSystemName: 'Originating System Name',
};

export const FIELD_GROUPS = [
  {
    label: 'Member Name',
    fields: ['MemberFullName', 'MemberLastName', 'MemberFirstName', 'MemberMiddleInitial', 'MemberNickname'],
  },
  {
    label: 'Member Details',
    fields: ['MemberType', 'MemberNationalAssociationId'],
  },
  {
    label: 'License Info',
    fields: ['MemberStateLicense', 'MemberStateLicenseType', 'MemberStateLicenseState', 'MemberMlsId'],
  },
  {
    label: 'Office Info',
    fields: ['OfficeName', 'OfficeMlsId'],
  },
  {
    label: 'System Info',
    fields: ['SourceSystemID', 'SourceSystemName', 'OriginatingSystemID', 'OriginatingSystemName'],
  },
];

export const ALL_FIELDS = Object.keys(FIELD_WEIGHTS);
