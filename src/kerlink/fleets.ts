import { LoriotGateway, LoriotNetwork } from '../loriot/networks';
import { loadCsvFile } from '../utils';

const FLEETS_PATH = './data/fleets.csv';
const GATEWAYS_PATH = './data/gateways.csv';

export type KerlinkFleet = {
  id: number;
  name: string;
  gateways: KerlinkGateway[];
};

export type KerlinkGateway = {
  eth0MAC: string;
  eui: string;
  fleetId: number;
  name: string;
  brandName: string;
  region: string;
  description: string;
  latitude?: number;
  longitude?: number;
};

export async function loadKerlinkFleets(): Promise<LoriotNetwork[]> {
  console.debug(`Loading fleets from CSV ...`);

  /**
   * Gateways
   */
  console.log(`Loading kerlink gateways from ${GATEWAYS_PATH} ...`);
  const gateways: KerlinkGateway[] = await loadCsvFile(GATEWAYS_PATH);
  console.log(`Found ${gateways.length} gateways!`);
  // TODO: validate expected fields

  /**
   * Fleets
   */
  console.log(`Loading kerlink fleets from ${FLEETS_PATH} ...`);
  const fleets: KerlinkFleet[] = await loadCsvFile(FLEETS_PATH).then(
    (data: KerlinkFleet[]) => {
      console.log(`Found ${data.length} fleets!`);

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
    }
  );

  console.debug(`Fleets loading complete!`);
  console.debug(`*************************************`);

  /**
   * Translate from Kerlink to LORIOT
   */
  console.debug(`Translating fleets into LORIOT networks ...`);
  const networks: LoriotNetwork[] = [];
  for (const kerlinkFleet of fleets) {
    // Prepare LORIOT device
    const net: LoriotNetwork = translateKerlinkFleet(kerlinkFleet);
    // Add device to application list
    networks.push(net);
  }

  console.debug(`Fleets translation complete!`);
  console.debug(`*************************************`);

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
      console.log(
        `Unable to translate gateway "${kerlinkGateway.eui}": ${err.message}`
      );
    }
  }

  return net;
}

function translateKerlinkGateway(
  kerlinkGateway: KerlinkGateway
): LoriotGateway {
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

  throw new Error(
    `Unknown model ${kerlinkGateway.brandName} ${kerlinkGateway.description}`
  );
}
