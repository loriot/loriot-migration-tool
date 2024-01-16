import csv from 'csvtojson';
import fs from 'fs';

const DEVICES_PATH = './data/devices.csv';
const CLUSTERS_PATH = './data/clusters.csv';
const PUSHCONFIGURATIONS_PATH = './data/pushConfigurations.csv';

type KerlinkClusterCsv = {
  id: number;
  name: string;
  pushEnabled: boolean;
  pushConfiguration: {
    id: number;
    links: {
      rel: string;
      href: string;
    }[];
  };
};

export type KerlinkCluster = {
  id: number;
  name: string;
  pushConfigurations: KerlinkPushConfiguration[];
  devices: KerlinkDevice[];
};

export type KerlinkPushConfiguration = {
  id: number;
  name: string;
  type: string;
  msgDetailLevel: 'PAYLOAD' | 'RADIO' | 'NETWORK';

  // HTTP
  url: string;
  user: string;
  password: string;
  httpDataUpRoute: string;
  httpDataDownEventRoute: string;
  headers: string;
  tlsCertFileName: string;
  tlsKeyFileName: string;
  tlsCaFileName: string;
};

export type KerlinkDevice = {
  // Used fields
  clusterId: number;
  clusterName: string;
  devEui: string;
  name: string;
  classType: string;
  macVersion: string;
  adrEnabled: boolean;
  activation: string;
  appEui: string;
  appKey: string;
  fcntDown: number;
  fcntUp: number;
  rx1Delay: number;
  rxWindows: number;
  dev_addr: string;
  NwkSKey: string;
  AppSKey: string;

  // TODO: to be used
  extraction_date: Date;
  customerId: string;
  customerName: string;
  rfRegions: string;
  country: string;
  regParamsRevision: string;
  profile: string;
  devNonceCounter: string;
  fNwkSIntKey: string;
  sNwkSIntKey: string;
  rx1DrOffset: number;
  rx2Dr: number;
  rx2Freq: number;
  cfList: string;
  dwellTime: number;
  pingSlotDr: number;
  pingSlotFreq: number;
  geolocation: string;
  latitude: number;
  longitude: number;
  altitude: number;
  status: string;
  lastDataUpDr: number;
  devices_profiles: string;
};

export async function loadKerlinkClusters(): Promise<KerlinkCluster[]> {
  console.debug(`Loading clusters from CSV ...`);

  /**
   * Devices
   */
  var devices: KerlinkDevice[] = [];
  if (!fs.existsSync(DEVICES_PATH)) {
    console.log(
      `File ${DEVICES_PATH} not found: devices will not be imported!`
    );
  } else {
    console.log(`Loading kerlink devices from ${DEVICES_PATH} ...`);
    devices = await csv()
      .fromFile(DEVICES_PATH)
      .then((data: KerlinkDevice[]) => {
        console.log(`Found ${data.length} devices!`);

        // Cast and validate CSV fields
        for (const device of data) {
          device.adrEnabled = (device as any).adrEnabled == 'true';
          device.rxWindows = Number(device.rxWindows);
          device.rx1Delay = Number(device.rx1Delay);
          device.fcntUp = Number(device.fcntUp);
          device.fcntDown = Number(device.fcntDown);
          // TODO: cast other fields
          // TODO: validate datatypes
        }

        return data;
      });
  }

  /**
   * Push Configurations
   */
  var pushConfigurations: KerlinkPushConfiguration[] = [];
  if (!fs.existsSync(PUSHCONFIGURATIONS_PATH)) {
    console.log(
      `File ${PUSHCONFIGURATIONS_PATH} not found: push configurations will not be imported!`
    );
  } else {
    console.log(
      `Loading kerlink push configurations from ${PUSHCONFIGURATIONS_PATH} ...`
    );
    pushConfigurations = await csv()
      .fromFile(PUSHCONFIGURATIONS_PATH)
      .then((data: KerlinkPushConfiguration[]) => {
        console.log(`Found ${data.length} push configurations!`);

        // Cast and validate CSV fields
        for (const pushConfiguration of data) {
          pushConfiguration.id = Number(pushConfiguration.id);
          // TODO: cast other fields
          // TODO: validate datatypes
        }

        return data;
      });
  }

  /**
   * Clusters
   */
  var clusters: KerlinkCluster[] = [];
  if (!fs.existsSync(CLUSTERS_PATH)) {
    console.log(
      `File ${CLUSTERS_PATH} not found: clusters will not be imported!`
    );
  } else {
    console.log(
      `Loading kerlink push configurations from ${PUSHCONFIGURATIONS_PATH} ...`
    );
    clusters = await csv()
      .fromFile(CLUSTERS_PATH)
      .then((data: KerlinkClusterCsv[]) => {
        console.log(`Found ${data.length} clusters!`);

        // Cast and validate CSV fields
        const result: KerlinkCluster[] = [];
        for (const clusterCsv of data) {
          clusterCsv.id = Number(clusterCsv.id);
          clusterCsv.pushConfiguration = JSON.parse(
            (clusterCsv as any).pushConfiguration
          );
          // TODO: cast other fields
          // TODO: validate datatypes

          // Recollect devices and push configurations already parsed
          const cluster: KerlinkCluster = {
            id: clusterCsv.id,
            name: clusterCsv.name,
            devices: devices.filter((dev) => dev.clusterId == clusterCsv.id),
            pushConfigurations: pushConfigurations.filter(
              (pc) => pc.id == clusterCsv.pushConfiguration.id
            ),
          };

          result.push(cluster);
        }

        return result;
      });
  }

  console.debug(`Clusters loading complete!`);
  console.debug(`*************************************`);

  return clusters;
}
