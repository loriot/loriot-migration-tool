import { loadCsvFile } from '../utils';

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
  console.log(`Loading kerlink devices from ${DEVICES_PATH} ...`);
  const devices: KerlinkDevice[] = await loadCsvFile(DEVICES_PATH);
  console.log(`Found ${devices.length} devices!`);
  // TODO: validate expected fields

  /**
   * Push Configurations
   */
  console.log(
    `Loading kerlink push configurations from ${PUSHCONFIGURATIONS_PATH} ...`
  );
  const pushConfigurations: KerlinkPushConfiguration[] = await loadCsvFile(
    PUSHCONFIGURATIONS_PATH
  );
  console.log(`Found ${pushConfigurations.length} push configurations!`);
  // TODO: validate expected fields

  /**
   * Clusters
   */
  console.log(
    `Loading kerlink push configurations from ${PUSHCONFIGURATIONS_PATH} ...`
  );
  const clusters: KerlinkCluster[] = await loadCsvFile(CLUSTERS_PATH).then(
    (data: KerlinkClusterCsv[]) => {
      console.log(`Found ${data.length} clusters!`);

      const result: KerlinkCluster[] = [];
      for (const clusterCsv of data) {
        // TODO: validate expected fields

        clusterCsv.pushConfiguration = JSON.parse(
          (clusterCsv as any).pushConfiguration
        );

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
    }
  );

  console.debug(`Clusters loading complete!`);
  console.debug(`*************************************`);

  return clusters;
}
