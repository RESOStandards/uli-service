/**
 * Web API ingest through the RESO Client SDK.
 *
 * Reads the Member Resource with the seventeen ULI fields selected. `Office` is
 * expandable on Member, but `OfficeMlsId` and `OfficeName` are denormalized onto
 * Member already, and no office address is in the weight table, so the
 * expansion is off unless asked for; it costs a join on every page for nothing
 * the engine uses.
 */

import { createClient, followAllPages, queryEntities, type AuthConfig, type ODataClient, type ODataEntity } from '@reso-standards/reso-client';
import { ULI_FIELDS, ULI_IDENTIFIER_FIELD } from '../sdk/fields.js';

export interface WebApiSource {
  readonly baseUrl: string;
  readonly auth: AuthConfig;
}

export interface FetchOptions {
  readonly pageSize?: number;
  readonly expandOffice?: boolean;
  readonly filter?: string;
}

export const memberSelect = (): string => [...ULI_FIELDS, ULI_IDENTIFIER_FIELD].join(',');

export const openSource = (source: WebApiSource): Promise<ODataClient> => createClient({ baseUrl: source.baseUrl, auth: source.auth });

export const fetchMembers = async (client: ODataClient, options: FetchOptions = {}): Promise<readonly ODataEntity[]> => {
  const first = await queryEntities(client, 'Member', {
    $select: memberSelect(),
    $top: options.pageSize ?? 200,
    ...(options.expandOffice === true ? { $expand: 'Office' } : {}),
    ...(options.filter === undefined ? {} : { $filter: options.filter }),
  });
  if (first.status !== 200) throw new Error(`Member query failed with ${first.status}: ${first.rawBody.slice(0, 300)}`);
  return followAllPages(client, first);
};
