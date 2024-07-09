import axios, { AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';
import { getPaginatedResponse } from './utils';

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
  console.debug(`************* IMPORT NETWORKS AND GATEWAYS TO LORIOT *************`);

  /**
   * Call LORIOT API to create recourses
   */
  for (const net of networks) {
    try {
      // Create network
      const netId = await createNet(net);
      console.debug(`[${net.name}] Network created`);

      // Create gateways
      for (const gw of net.gateways) {
        try {
          // Create gateway
          await createGateway(netId, gw);
          console.debug(`[${net.name}][GW][${gw.MAC}] Gateway created`);
        } catch (err: any) {
          console.error(`[${net.name}][GW][${gw.MAC}] Gateway creation error: ${getErrorMessage(err)}`);
        }
      }
    } catch (err: any) {
      console.error(`[${net.name}] Network creation error: ${getErrorMessage(err)}`);
    }
  }

  console.debug(``);
}

async function createNet(name: LoriotNetwork): Promise<string> {
  return axios
    .post(
      `https://${process.env.URL}/1/nwk/networks`,
      {
        name: name.name,
        visibility: 'public',
      },
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then((res: AxiosResponse) => {
      return res.data._id.toString(16).toUpperCase();
    });
}

async function createGateway(netId: string, gw: LoriotGateway): Promise<string> {
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

export async function cleanNetworks(networks: LoriotNetwork[]) {
  console.debug(`************* CLEAN LORIOT NETWORKS AND GATEWAYS *************`);

  // Count deleted resource to log
  var deletedGateways = 0;
  var deletedNetworks = 0;

  // Get all deveuis to import
  const macToImport = new Set(networks.map((net) => net.gateways.map((gw) => gw.MAC.toUpperCase())).flat());

  // Get LORIOT existing networks
  const nets: any[] = await getPaginatedResponse(new URL(`https://${process.env.URL}/1/nwk/networks`), process.env.AUTH as string, 'networks');

  // Iterate over LORIOT existing networks
  for (const net of nets) {
    try {
      const netId = net._id.toString(16).toUpperCase();

      // Get LORIOT network existing devices
      const netGateways: any[] = await getPaginatedResponse(new URL(`https://${process.env.URL}/1/nwk/network/${netId}/gateways`), process.env.AUTH as string, 'gateways');

      // Iterate over LORIOT existing gateways
      for (const netGateway of netGateways) {
        const mac = netGateway.MAC.toUpperCase();

        // If the gateway to import already exists, let's delete it from LORIOT
        if (macToImport.has(mac)) {
          try {
            const gweui = netGateway._id;
            await axios.delete(`https://${process.env.URL}/1/nwk/network/${netId}/gateways/${gweui}`, { headers: { Authorization: process.env.AUTH } });
            console.debug(`[${net.name}][DEV][${mac}] Gateway deleted`);
            deletedGateways++;
          } catch (err: any) {
            console.error(`[${net.name}][DEV][${mac}] Gateway deletion error: ${getErrorMessage(err)}`);
          }
        }
      }

      // Check how many gateways have been left in the network
      const updatedNet = await axios.get(`https://${process.env.URL}/1/nwk/network/${netId}`, {
        headers: { Authorization: process.env.AUTH },
      });

      // If no gateways, delete the network
      if (updatedNet.data.gateways == 0) {
        try {
          await axios.delete(`https://${process.env.URL}/1/nwk/network/${netId}`, {
            headers: { Authorization: process.env.AUTH },
          });
          console.debug(`[${net.name}] Empty network deleted`);
          deletedNetworks++;
        } catch (err: any) {
          console.error(`[${net.name}] Network deletion error: ${getErrorMessage(err)}`);
        }
      }
    } catch (err: any) {
      console.error(`[${net.name}] Network clean error: ${getErrorMessage(err)}`);
    }
  }

  console.debug(`-> ${deletedNetworks} networks deleted`);
  console.debug(`-> ${deletedGateways} gateways deleted`);
  console.debug(``);
}
