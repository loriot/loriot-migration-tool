import util from 'util';
import { LoriotGateway, LoriotNetwork } from '../loriot/networks';
import * as grpc from '@grpc/grpc-js';
import { GatewayServiceClient } from '@chirpstack/chirpstack-api/api/gateway_grpc_pb';
import {
  GatewayListItem,
  ListGatewaysRequest,
  ListGatewaysResponse,
} from '@chirpstack/chirpstack-api/api/gateway_pb';
import { sleep } from '../utils';

export async function loadChirpstackGateways(
  url: string,
  apiToken: string,
  tenantId: string
): Promise<LoriotNetwork> {
  console.debug(`Loading gateways ...`);

  // Gateways not organized in networks on Chirpstack
  // so create just one network in LORIOT
  const network: LoriotNetwork = {
    name: 'Chirpstack',
    gateways: [],
  };

  const gateways = await loadGateways(url, apiToken, tenantId);
  for (const gateway of gateways) {
    network.gateways.push(await translate(gateway));
  }

  console.debug(`Gateways loading complete!`);
  console.debug(`*************************************`);
  return network;
}

async function loadGateways(
  url: string,
  apiToken: string,
  tenantId: string
): Promise<GatewayListItem.AsObject[]> {
  const channel = new GatewayServiceClient(
    url,
    grpc.credentials.createInsecure()
  );

  const LIMIT = 10;
  var OFFSET = 0;
  const req = new ListGatewaysRequest();
  req.setLimit(LIMIT);
  req.setOffset(OFFSET);
  req.setTenantId(tenantId);

  var totalCount: number;
  const gateways: GatewayListItem.AsObject[] = [];
  do {
    const page = await list(channel, req, apiToken);
    gateways.push(...page.resultList);

    // Move to next page
    OFFSET += LIMIT;
    req.setOffset(OFFSET);

    // Repeat until not reach the total count
    totalCount = page.totalCount;
  } while (gateways.length < totalCount);

  return gateways;
}

async function list(
  channel: GatewayServiceClient,
  req: ListGatewaysRequest,
  apiToken: string
): Promise<ListGatewaysResponse.AsObject> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    channel.list(req, metadata, (err, resp?: ListGatewaysResponse) => {
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

async function translate(
  chirspstackGateway: GatewayListItem.AsObject
): Promise<LoriotGateway> {
  const gw: LoriotGateway = {
    title: chirspstackGateway.name,
    notes: chirspstackGateway.description,
    customEUI: chirspstackGateway.gatewayId,
    MAC: await randomMAC(), // TODO: how to retrieve original MAC?
    region: 'EU868', // TODO: ask for it
    location: {
      lat: chirspstackGateway.location?.latitude ?? 46.8076885,
      lon: chirspstackGateway.location?.longitude ?? 7.100528,
    },
    // Basics station
    base: 'basics-station',
    bus: 'SPI',
    card: '',
    concentrator: 'SX130x',
    model: 'semtech',
  };

  return gw;
}

async function randomMAC(): Promise<string> {
  const d = new Date();
  const dd = ('0' + d.getDate()).slice(-2);
  const MM = ('0' + (d.getMonth() + 1)).slice(-2);
  const HH = ('0' + d.getHours()).slice(-2);
  const mm = ('0' + d.getMinutes()).slice(-2);
  const SS = ('0' + d.getSeconds()).slice(-2);
  const ms = ('0' + d.getMilliseconds()).slice(-2);

  // Wait 1ms to generate a new random MAC
  await sleep(1);

  return `${dd}:${MM}:${HH}:${mm}:${SS}:${ms}`;
}
