import csv from 'csvtojson';
import fs from 'fs';

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
  var gateways: KerlinkGateway[] = [];
  if (!fs.existsSync(GATEWAYS_PATH)) {
    console.log(
      `File ${GATEWAYS_PATH} not found: gateways will not be imported!`
    );
  } else {
    console.log(`Loading kerlink gateways from ${GATEWAYS_PATH} ...`);
    gateways = await csv()
      .fromFile(GATEWAYS_PATH)
      .then((data: KerlinkGateway[]) => {
        console.log(`Found ${data.length} gateways!`);

        // Cast and validate CSV fields
        for (const gateway of data) {
          gateway.fleetId = Number(gateway.fleetId);

          gateway.latitude = Number(gateway.latitude);
          gateway.longitude = Number(gateway.longitude);
          if (isNaN(gateway.latitude) || isNaN(gateway.longitude)) {
            // Not numbers
            delete gateway.latitude;
            delete gateway.longitude;
          }

          // TODO: cast other fields
          // TODO: validate datatypes
        }

        return data;
      });
  }

  /**
   * Fleets
   */
  var fleets: KerlinkFleet[] = [];
  if (!fs.existsSync(FLEETS_PATH)) {
    console.log(`File ${FLEETS_PATH} not found: fleets will not be imported!`);
  } else {
    console.log(`Loading kerlink fleets from ${FLEETS_PATH} ...`);
    fleets = await csv()
      .fromFile(FLEETS_PATH)
      .then((data: KerlinkFleet[]) => {
        console.log(`Found ${data.length} fleets!`);

        // Cast and validate CSV fields
        const result: KerlinkFleet[] = [];
        for (const fleetCsv of data) {
          fleetCsv.id = Number(fleetCsv.id);
          // TODO: cast other fields
          // TODO: validate datatypes

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
  }

  console.debug(`Fleets loading complete!`);
  console.debug(`*************************************`);
  return fleets;
}
