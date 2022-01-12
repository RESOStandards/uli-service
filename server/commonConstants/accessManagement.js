const resoRolePrivileges = [
  {
    names: [
      "uoi",
      "payload-performance-reports-pre-opted-in",
      "market-average-payload-performance-metrics",
      "opted-in-payload-performance-reports",
    ],
    privileges: ["read"],
  },
  {
    names: ["certification-report"],
    privileges: ["read", "create_doc"],
  },
  {
    names: ["certification-status"],
    privileges: ["read", "create_doc", "create_index", "view_index_metadata"],
  },
];

module.exports = {
  resoRolePrivileges,
};
