import axios, { AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';

export type LoriotNetwork = {
  name: string;
  gateways: LoriotGateway[];
};

export type LoriotGateway = {
  title: string;
  EUI: string;
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
      // Create application
      console.debug(`[${net.name}] Creating network ...`);
      const netId = await createNet(net);
      console.debug(`[${net.name}] Network created!`);

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
