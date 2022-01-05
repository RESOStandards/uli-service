import React, { useState, useContext } from "react";
import { Button } from "components/common";
import { format } from "fecha";

import { syncOrganization, fetchAllOrganizations } from "apis/organization";

import { OrganizationContext } from "contexts/organization";

const OrgManagement = () => {
  const [organizations, setOrganizations] = useContext(OrganizationContext);

  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full relative flex justify-between items-center rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 mb-8">
      <span className="flex items-center mr-12 gap-2">
        <h3
          className="text-2xl font-semibold text-left"
          data-test-id="manage-organizations-heading"
        >
          Manage Organizations
        </h3>
        {organizations?.[0] && (
          <>
            <p className="p-1 font-semibold text-gray-500 bg-gray-300 shadow-inner rounded">
              {organizations.length}
            </p>
            {organizations[0].lastSyncedAt && (
              <p className="text-gray-500">
                Last updated on:{" "}
                {format(
                  new Date(organizations[0].lastSyncedAt),
                  "MMM D YYYY [at] h:mm a"
                )}
              </p>
            )}
          </>
        )}
      </span>
      <Button
        label="Sync Organizations"
        dataTestId="sync-organizations-button"
        className="w-48"
        loading={loading}
        onClick={async () => {
          try {
            setLoading(true);
            await syncOrganization();
            setOrganizations((await fetchAllOrganizations()).data);
          } catch (err) {
            logger.error(
              "Error while syncing organization information => ",
              err?.response?.data?.message || err
            );
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
};

export default OrgManagement;
