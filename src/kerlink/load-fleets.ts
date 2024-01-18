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

export async function loadKerlinkFleets(): Promise<KerlinkFleet[]> {
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
  return fleets;
}
