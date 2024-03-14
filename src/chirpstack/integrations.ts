import { ApplicationServiceClient } from '@chirpstack/chirpstack-api/api/application_grpc_pb';
import {
  GetHttpIntegrationRequest,
  GetHttpIntegrationResponse,
  HttpIntegration,
} from '@chirpstack/chirpstack-api/api/application_pb';
import * as grpc from '@grpc/grpc-js';
import { LoriotOutput } from '../loriot/applications';

export async function loadIntegrations(
  url: string,
  apiToken: string,
  appId: string
): Promise<LoriotOutput[]> {
  const channel = new ApplicationServiceClient(
    url,
    grpc.credentials.createInsecure()
  );

  const res: LoriotOutput[] = [];

  // HTTP
  const http = await getHttpIntegration(channel, apiToken, appId);
  if (http) {
    res.push(translateHttpIntegration(http));
  }

  // TODO: check other integrations

  return res;
}

async function getHttpIntegration(
  channel: ApplicationServiceClient,
  apiToken: string,
  appId: string
): Promise<HttpIntegration.AsObject | undefined> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    const req: GetHttpIntegrationRequest = new GetHttpIntegrationRequest();
    req.setApplicationId(appId);

    channel.getHttpIntegration(
      req,
      metadata,
      (err, resp?: GetHttpIntegrationResponse) => {
        if (err) {
          reject(err);
        } else if (!resp) {
          reject(new Error(`grpc response undefined`));
        } else {
          const integration = resp.getIntegration();
          if (integration) {
            resolve(integration.toObject());
          } else {
            resolve(undefined);
          }
        }
      }
    );
  });
}

function translateHttpIntegration(
  httpIntegration: HttpIntegration.AsObject
): LoriotOutput {
  return {
    name: 'HTTP',
    url: httpIntegration.eventEndpointUrl,
    // TODO: headers
  };
}
