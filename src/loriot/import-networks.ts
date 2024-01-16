import axios, { AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';
import { KerlinkFleet, KerlinkGateway } from '../kerlink/load-fleets';

type LoriotNetwork = {
  name: string;
  gateways: LoriotGateway[];
};

type LoriotGateway = {
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

export async function migrateFleets(kerlinkFleets: KerlinkFleet[]) {
  console.debug(`Migrating fleets to LORIOT ...`);

  /**
   * Translate from Kerlink to LORIOT
   */
  const nets: LoriotNetwork[] = [];
  for (const kerlinkFleet of kerlinkFleets) {
    // Prepare LORIOT device
    const net: LoriotNetwork = translateKerlinkFleet(kerlinkFleet);
    // Add device to application list
    nets.push(net);
  }

  /**
   * Call LORIOT API to create recourses
   */
  for (const net of nets) {
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

  console.debug(`Fleets migration complete!`);
  console.debug(`*************************************`);
}

function translateKerlinkFleet(kerlinkFleet: KerlinkFleet): LoriotNetwork {
  const net: LoriotNetwork = {
    name: kerlinkFleet.name,
    gateways: [],
  };

  // Translate gateways
  for (const kerlinkGateway of kerlinkFleet.gateways) {
    const gw: LoriotGateway = translateKerlinkGateway(kerlinkGateway);
    net.gateways.push(gw);
  }

  return net;
}

function translateKerlinkGateway(
  kerlinkGateway: KerlinkGateway
): LoriotGateway {
  const gw: LoriotGateway = {
    title: kerlinkGateway.name,
    EUI: kerlinkGateway.eui,
    MAC: kerlinkGateway.eth0MAC,
    region: kerlinkGateway.region,
    location: {
      lat: kerlinkGateway.latitude ?? 46.8076885,
      lon: kerlinkGateway.longitude ?? 7.100528,
    },
    ...translateGatewayModel(kerlinkGateway),
  };

  return gw;
}

function translateGatewayModel(kerlinkGateway: KerlinkGateway): {
  base: string;
  bus: string;
  card: string;
  concentrator: string;
  model: string;
} {
  if (kerlinkGateway.brandName == 'KERLINK') {
    // Kerlink iFemtocell (OS V4.x.x incl Evolution)
    if (/^Wirnet iFemtoCell/.test(kerlinkGateway.description)) {
      return {
        base: 'kerlink',
        bus: 'SPI',
        card: '',
        concentrator: 'kerlink_femtocell',
        model: 'evolution',
      };
    }

    // Kerlink iStation
    if (/^Wirnet iStation/.test(kerlinkGateway.description)) {
      return {
        base: 'kerlink',
        bus: 'SPI',
        card: '',
        concentrator: 'kerlink_femtocell',
        model: 'istation',
      };
    }

    // TODO: support more models
  }

  throw new Error(
    `Unknown model ${kerlinkGateway.brandName} ${kerlinkGateway.description}`
  );
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
