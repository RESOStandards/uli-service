const { reportTypes } = require("../../server/constants/reportTypes");

/*
 *
 * ***************************************************************
 * CAUTION !!! please update tests if you are changing constants *
 * ***************************************************************
 *
 */
const dataDictionaryReport = {
  description: "RESO Data Dictionary Metadata Report",
  version: "1.7",
  generatedOn: "2021-04-13T03:55:52.512475Z",
  type: reportTypes.DATA_DICTIONARY.name,
  fields: [
    {
      resourceName: "Property",
      fieldName: "AboveGradeFinishedArea",
      type: "Edm.Decimal",
    },
    {
      resourceName: "Property",
      fieldName: "Appliances",
      type: "PropertyEnums.Appliances",
    },
    {
      resourceName: "Member",
      fieldName: "MemberKey",
      type: "Edm.String",
    },
    {
      resourceName: "Member",
      fieldName: "MemberEmail",
      type: "Edm.String",
    },
    {
      resourceName: "Office",
      fieldName: "OfficeKey",
      type: "Edm.String",
    },
    {
      resourceName: "Office",
      fieldName: "OfficeEmail",
      type: "Edm.String",
    },
    {
      resourceName: "Media",
      fieldName: "MediaKey",
      type: "Edm.String",
    },
    {
      resourceName: "Media",
      fieldName: "ShortDescription",
      type: "Edm.String",
    },
    {
      resourceName: "OpenHouse",
      fieldName: "OpenHouseKey",
      type: "Edm.String",
    },
    {
      resourceName: "OpenHouse",
      fieldName: "OpenHouseDate",
      type: "Edm.Date",
    },
    {
      resourceName: "Room",
      fieldName: "RoomLength",
      type: "Edm.Decimal",
    },
    {
      resourceName: "Room",
      fieldName: "RoomWidth",
      type: "Edm.Decimal",
    },
  ],
  lookups: [
    {
      lookupName: "org.reso.metadata.enums.AreaSource",
      lookupValue: "Appraiser",
      type: "Edm.Int32",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Cooktop",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Dishwasher",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Disposal",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__ae8etzqm9npqnqmwe",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Double Oven",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__kie62r6ck0tcogkl1e1okmd",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Downdraft Range",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Dryer",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__7egumas5zfwbx1",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Dryer H/U",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__kt4yzozv8jjz46rq515ht7t",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Energy Star (G)",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__888r90wlpnt4h4hgu0gcy1410za6bn2",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Frestnd Elec Stv/Ovn",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__15nqbyfu1x5s6wznql4yy7ed7zdk6m",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Frestnd Gas Stv/Ovn",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Grill",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Humidifier",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__b5jybp1dyaak2tu2c",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Instant Hot",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__uwwwa1aro0b25v3z2tn83v6n3m",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Instant Hot Water",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Microwave",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__1rcm5qxhp044tnc4",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Range Hood",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Refrigerator",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__oztc4b4veu6xs1yitc1oyge",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Self Clean Oven",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__cod58r7fwqy5u0lsf",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Stackable O",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__3imi5m2jbmpdlb180rt2ex",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Stackable Only",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "Washer",
      type: "Edm.Int64",
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__1v71c4cepw1fyx5h",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Washer H/U",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__1fo8dna5nsd1b1o91z3pq027euly04",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Water Softr. Leased",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__79lff3465obzv680u8yjz1v9nyw4",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Water Softr. Owned",
        },
      ],
    },
    {
      lookupName: "PropertyEnums.Appliances",
      lookupValue: "b__da06fmywts3q6t6r6",
      type: "Edm.Int64",
      annotations: [
        {
          type: "RESO.OData.Metadata.StandardName",
          value: "Wine Cooler",
        },
      ],
    },
  ],
};
module.exports = {
  dataDictionaryReport,
};
