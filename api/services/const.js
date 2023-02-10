"use strict";

const ULI_TEMPLATE = {
  MemberFullName: {
    filter: {
      fuzzy: {
        MemberFullName: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 10,
  },
  MemberLastName: {
    filter: {
      fuzzy: {
        MemberLastName: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 1,
  },
  MemberFirstName: {
    filter: {
      fuzzy: {
        MemberFirstName: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 1,
  },
  MemberMiddleInitial: {
    filter: {
      fuzzy: {
        MemberMiddleInitial: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 1,
  },
  MemberNickname: {
    filter: {
      fuzzy: {
        MemberNickname: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 3,
  },
  MemberType: {
    filter: {
      fuzzy: {
        MemberType: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 3,
  },
  MemberNationalAssociationId: {
    filter: {
      fuzzy: {
        MemberNationalAssociationId: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 10,
  },
  MemberStateLicense: {
    filter: {
      fuzzy: {
        MemberStateLicense: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 10,
  },
  MemberStateLicenseType: {
    filter: {
      fuzzy: {
        MemberStateLicenseType: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 3,
  },
  MemberStateLicenseState: {
    filter: {
      fuzzy: {
        MemberStateLicenseState: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 6,
  },
  MemberMlsId: {
    filter: {
      fuzzy: {
        MemberMlsId: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 5,
  },
  OfficeName: {
    filter: {
      fuzzy: {
        OfficeName: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 2,
  },
  OfficeMlsId: {
    filter: {
      fuzzy: {
        OfficeMlsId: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 10,
  },
  SourceSystemID: {
    filter: {
      fuzzy: {
        SourceSystemID: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 10,
  },
  SourceSystemName: {
    filter: {
      fuzzy: {
        SourceSystemName: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 5,
  },
  OriginatingSystemID: {
    filter: {
      fuzzy: {
        OriginatingSystemID: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 10,
  },
  OriginatingSystemName: {
    filter: {
      fuzzy: {
        OriginatingSystemName: {
          value: null,
          fuzziness: 2,
          transpositions: true,
        },
      },
    },
    weight: 5,
  },
};

module.exports = {
  ULI_TEMPLATE,
};
