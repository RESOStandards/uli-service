import { statusConstants } from "commonConstants/certification";
import { resourcesByOrder } from "constants/resourceList";

export const getOrgName = (report, organizations) =>
  organizations
    ?.find((org) => org.id === report?.providerUoi)
    ?.name.toLowerCase();

export const sortReports = (reports, organizations) => {
  return (
    reports
      // sort in descending order of timestamp
      ?.sort((a, b) => {
        const aDate = new Date(
          a.status === statusConstants.passed.value
            ? a.generatedOn
            : a.statusUpdatedAt || null
        );
        const bDate = new Date(
          b.status === statusConstants.passed.value
            ? b.generatedOn
            : b.statusUpdatedAt || null
        );
        if (aDate < bDate) return 1;
        if (aDate > bDate) return -1;
        return 0;
      })
      // sort by ascending order of report type (Data Dictionary Comes first, Web API, the second, goes on...)
      .sort((a, b) => {
        let comparisonValue = a.type.localeCompare(b.type);
        if (comparisonValue === 0) {
          //if the report types are same
          if (a.providerUoi && b.providerUoi) {
            comparisonValue = getOrgName(a, organizations)?.localeCompare(
              getOrgName(b, organizations)
            );
          }
          if (a.status === statusConstants.in_progress.value) {
            comparisonValue = -1;
          } else if (b.status === statusConstants.in_progress.value) {
            comparisonValue = 1;
          }
        }
        return comparisonValue;
      })
  );
};

export const transformResourcesIntoOrderedList = (resourceFieldsMap) => {
  if (resourceFieldsMap) {
    let transformedResources = resourceFieldsMap;
    transformedResources = resourcesByOrder.reduce(
      (result, resourceLabel, index) => {
        const resource = transformedResources[resourceLabel];
        if (resource) {
          result.push(resource);
          delete transformedResources[resourceLabel];
        }
        if (index === resourcesByOrder.length - 1) {
          if (Object.keys(transformedResources).length > 0) {
            result = [...result, ...Object.values(transformedResources)];
          }
        }
        return result;
      },
      []
    );
    return transformedResources;
  }
};
