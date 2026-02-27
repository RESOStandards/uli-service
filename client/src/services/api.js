import { createMockSearchResponse, MOCK_DASHBOARD, MOCK_CONFLICTS } from '../mock/mockData';

const USE_MOCK = true;

export const searchLicensees = async (searchFields, explain = false) => {
  if (USE_MOCK) {
    return createMockSearchResponse(searchFields);
  }

  const fieldValues = Object.entries(searchFields)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([fieldName, value]) => ({ fieldName, value }));

  const response = await fetch('/uli-service/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fieldValues),
  });

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  return response.json();
};

export const createUli = async (licenseeData, providerUoi = 'UI-MANUAL') => {
  if (USE_MOCK) {
    return { UniqueLicenseeIdentifier: `urn:reso:uli:${crypto.randomUUID()}` };
  }

  const response = await fetch(`/uli-service/v1/ingest/${providerUoi}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([licenseeData]),
  });

  if (!response.ok) {
    throw new Error(`Ingest failed with status ${response.status}`);
  }

  return response.json();
};

export const getDashboardData = async () => {
  if (USE_MOCK) {
    return MOCK_DASHBOARD;
  }

  const response = await fetch('/uli-service/v1/dashboard');
  if (!response.ok) {
    throw new Error(`Dashboard fetch failed with status ${response.status}`);
  }
  return response.json();
};

export const getConflict = async (conflictId) => {
  if (USE_MOCK) {
    return MOCK_CONFLICTS[conflictId] || null;
  }

  const response = await fetch(`/uli-service/v1/conflicts/${conflictId}`);
  if (!response.ok) {
    throw new Error(`Conflict fetch failed with status ${response.status}`);
  }
  return response.json();
};

export const resolveConflict = async (conflictId, resolution) => {
  if (USE_MOCK) {
    return { success: true, conflictId, resolution };
  }

  const response = await fetch(`/uli-service/v1/conflicts/${conflictId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution }),
  });

  if (!response.ok) {
    throw new Error(`Resolve failed with status ${response.status}`);
  }
  return response.json();
};
