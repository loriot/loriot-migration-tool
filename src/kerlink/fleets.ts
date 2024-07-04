import { LoriotGateway, LoriotNetwork } from '../loriot/networks';
import { loadCsvFile } from '../utils';

const FLEETS_PATH = './data/fleets.csv';
const GATEWAYS_PATH = './data/gateways.csv';

export type KerlinkFleetCsv = {
  id: number;
  name: string;
};

export type KerlinkFleet = {
  id: number;
  name: string;
  gateways: KerlinkGateway[];
};

export type KerlinkGateway = {
  eth0MAC: string;
  eui: string;
  fleetId: number;
  fleetName: string;
  name: string;
  brandName: string;
  region: string;
  description: string;
  latitude?: number;
  longitude?: number;
};

export async function loadKerlinkFleets(): Promise<LoriotNetwork[]> {
  console.debug(`************* LOAD KERLINK FLEETS AND GATEWAYS *************`);

  /**
   * Gateways
   */
  console.log(`Loading kerlink gateways from ${GATEWAYS_PATH} ...`);
  const gateways: KerlinkGateway[] = await loadCsvFile(GATEWAYS_PATH);
  console.log(`-> Found ${gateways.length} gateways!`);
  // TODO: validate expected fields

  /**
   * Fleets
   */
  console.log(`Loading kerlink fleets from ${FLEETS_PATH} ...`);
  const fleets: KerlinkFleet[] = await loadCsvFile(FLEETS_PATH).then((data: KerlinkFleetCsv[]) => {
    if (data.length == 0) {
      // No fleets.csv file, let's get fleets from gateways
      for (const gateway of gateways) {
        const fleet = data.find((fleet) => fleet.id == gateway.fleetId);
        if (!fleet) {
          // First time for this cluster, save it
          data.push({
            id: gateway.fleetId,
            name: gateway.fleetName ?? `Fleet ${gateway.fleetId}`,
          });
        }
      }
    }

    console.log(`-> Found ${data.length} fleets!`);

    // Cast and validate CSV fields
    const result: KerlinkFleet[] = [];
    for (const fleetCsv of data) {
      // TODO: validate expected fields

      // Recollect gateways already parsed
      const fleet: KerlinkFleet = {
        id: fleetCsv.id,
        name: fleetCsv.name,
        gateways: gateways.filter((gw) => gw.fleetId == fleetCsv.id),
      };

      result.push(fleet);
    }

    return result;
  });

  /**
   * Translate from Kerlink to LORIOT
   */
  const networks: LoriotNetwork[] = [];
  if (fleets.length > 0) {
    console.debug(``);
    console.debug(`************* TRANSLATING KERLINK INTO LORIOT GATEWAYS *************`);
    for (const kerlinkFleet of fleets) {
      // Prepare LORIOT device
      const net: LoriotNetwork = translateKerlinkFleet(kerlinkFleet);
      // Add device to application list
      networks.push(net);
    }
  }

  console.debug(``);

  return networks;
}

function translateKerlinkFleet(kerlinkFleet: KerlinkFleet): LoriotNetwork {
  const net: LoriotNetwork = {
    name: kerlinkFleet.name,
    gateways: [],
  };

  // Translate gateways
  for (const kerlinkGateway of kerlinkFleet.gateways) {
    try {
      const gw: LoriotGateway = translateKerlinkGateway(kerlinkGateway);
      net.gateways.push(gw);
    } catch (err: any) {
      console.log(`(X) Unable to translate gateway "${kerlinkGateway.eui}": ${err.message}`);
    }
  }

  return net;
}

function translateKerlinkGateway(kerlinkGateway: KerlinkGateway): LoriotGateway {
  const gw: LoriotGateway = {
    title: kerlinkGateway.name,
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
    if (/iFemtoCell/.test(kerlinkGateway.description)) {
      return {
        base: 'kerlink',
        bus: 'SPI',
        card: '',
        concentrator: 'kerlink_femtocell',
        model: 'evolution',
      };
    }

    // Kerlink iStation
    if (/iStation/.test(kerlinkGateway.description)) {
      return {
        base: 'kerlink',
        bus: 'SPI',
        card: '',
        concentrator: 'kerlink_femtocell',
        model: 'istation',
      };
    }

    // Kerlink iBTS
    if (/iBts/.test(kerlinkGateway.description)) {
      return {
        base: 'kerlink',
        bus: 'SPI',
        card: '',
        concentrator: 'kerlink_ibts_v2_61',
        model: 'ibts',
      };
    }

    // TODO: support more models
  }

  throw new Error(`Unknown model ${kerlinkGateway.brandName} ${kerlinkGateway.description}`);
}
