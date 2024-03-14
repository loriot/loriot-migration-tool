import * as grpc from '@grpc/grpc-js';
import { ApplicationServiceClient } from '@chirpstack/chirpstack-api/api/application_grpc_pb';
import {
  ApplicationListItem,
  ListApplicationsRequest,
  ListApplicationsResponse,
} from '@chirpstack/chirpstack-api/api/application_pb';
import { LoriotApplication, LoriotDevice } from '../loriot/applications';
import { loadChirpstackDevices } from './devices';
import { loadIntegrations } from './integrations';

export async function loadChirpstackApplications(
  url: string,
  apiToken: string,
  tenantId: string
): Promise<LoriotApplication[]> {
  console.debug(`Loading applications ...`);
  const loriotApplications: LoriotApplication[] = [];

  const applications = await loadApplications(url, apiToken, tenantId);
  for (const application of applications) {
    const app: LoriotApplication = {
      name: application.name,
      devices: await loadChirpstackDevices(url, apiToken, application.id),
      outputs: await loadIntegrations(url, apiToken, application.id),
    };

    loriotApplications.push(app);
  }

  console.debug(`Applications loading complete!`);
  console.debug(`*************************************`);
  return loriotApplications;
}

async function loadApplications(
  url: string,
  apiToken: string,
  tenantId: string
): Promise<ApplicationListItem.AsObject[]> {
  const channel = new ApplicationServiceClient(
    url,
    grpc.credentials.createInsecure()
  );

  const LIMIT = 10;
  var OFFSET = 0;
  const req = new ListApplicationsRequest();
  req.setLimit(LIMIT);
  req.setOffset(OFFSET);
  req.setTenantId(tenantId);

  var totalCount: number;
  const applications: ApplicationListItem.AsObject[] = [];
  do {
    const page = await list(channel, req, apiToken);
    applications.push(...page.resultList);

    // Move to next page
    OFFSET += LIMIT;
    req.setOffset(OFFSET);

    // Repeat until not reach the total count
    totalCount = page.totalCount;
  } while (applications.length < totalCount);

  return applications;
}

async function list(
  channel: ApplicationServiceClient,
  req: ListApplicationsRequest,
  apiToken: string
): Promise<ListApplicationsResponse.AsObject> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    channel.list(req, metadata, (err, resp?: ListApplicationsResponse) => {
      if (err) {
        reject(err);
      } else if (!resp) {
        reject(new Error(`grpc response undefined`));
      } else {
        resolve(resp.toObject());
      }
    });
  });
}
