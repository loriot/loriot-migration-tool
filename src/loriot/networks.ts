import axios, { AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';

export type LoriotNetwork = {
  name: string;
  gateways: LoriotGateway[];
};

export type LoriotGateway = {
  title: string;
  notes?: string;
  /* custom EUI to be used only with basics station or packet forwarder */
  customEUI?: string;
  MAC: string;
  region: string;
  location: {};
  base: string;
  bus: string;
  card: string;
  concentrator: string;
  model: string;
};

export async function importNetworks(networks: LoriotNetwork[]) {
  console.debug(`Importing networks to LORIOT ...`);

  /**
   * Call LORIOT API to create recourses
   */
  for (const net of networks) {
    try {
      // Check if network already exists on LORIOT (by Name) to support multiple import attempts
      var netId = await getNetwork(net);
      if (!netId) {
        // Create application
        console.debug(`[${net.name}] Creating network ...`);
        netId = await createNet(net);
        console.debug(`[${net.name}] Network created!`);
      } else {
        console.debug(
          `[${net.name}] Reusing already existing network ${netId}!`
        );
      }

      // Create gateways
      for (const gw of net.gateways) {
        try {
          console.debug(`[${net.name}][GW][${gw.MAC}] Creating gateway ...`);
          await createGateway(netId, gw);
          console.debug(`[${net.name}][GW][${gw.MAC}] Gateway created!`);
        } catch (err: any) {
          console.error(
            `[${net.name}][GW][${
              gw.MAC
            }] Gateway creation error: ${getErrorMessage(err)}`
          );
        }
      }
    } catch (err: any) {
      console.error(
        `[${net.name}] Network creation error: ${getErrorMessage(err)}`
      );
    }
  }

  console.debug(`Networks migration complete!`);
  console.debug(`*************************************`);
}

async function getNetwork(network: LoriotNetwork): Promise<string> {
  return axios
    .get(
      `https://${process.env.URL}/1/nwk/networks?filter=name=${network.name}`,
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then((res: AxiosResponse) => {
      if (res.data.networks.length > 0) {
        return res.data.networks[0]._id.toString(16).toUpperCase();
      } else {
        return undefined;
      }
    });
}

async function createNet(name: LoriotNetwork): Promise<string> {
  return axios
    .post(
      `https://${process.env.URL}/1/nwk/networks`,
      {
        name: name.name,
        visibility: 'private',
      },
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then((res: AxiosResponse) => {
      return res.data._id.toString(16).toUpperCase();
    });
}

async function createGateway(
  netId: string,
  gw: LoriotGateway
): Promise<string> {
  return axios
    .post(
      `https://${process.env.URL}/1/nwk/network/${netId}/gateways`,
      {
        title: gw.title,
        MAC: gw.MAC,
        customEUI: gw.customEUI,
        location: gw.location,
        base: gw.base,
        bus: gw.bus,
        card: gw.card,
        concentrator: gw.concentrator,
        model: gw.model,
      },
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then((res: AxiosResponse) => {
      // TODO: call PUT to set region and channel plan
      return res.data._id.toString(16).toUpperCase();
    });
}
