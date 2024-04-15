import {
  LoriotApplication,
  LoriotDevice,
  LoriotHttpKerlinkOutput,
  LoriotOutput,
  eDeviceActivation,
  eDeviceClass,
  eDeviceVersion,
  eLoriotKerlinkOutputEncoding,
  eLoriotKerlinkOutputVerbosity,
  lorawanVersion,
} from '../loriot/applications';
import { addLeadingZeros, loadCsvFile } from '../utils';

const DEVICES_PATH = './data/devices.csv';
const CLUSTERS_PATH = './data/clusters.csv';
const PUSHCONFIGURATIONS_PATH = './data/pushConfigurations.csv';

type KerlinkClusterCsv = {
  id: number;
  name: string;
  hexa: boolean;
  pushEnabled: boolean;
  pushConfiguration?: {
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
  hexa: boolean;
  pushConfigurations: KerlinkPushConfiguration[];
  devices: KerlinkDevice[];
};

export enum eKerlinkPushConfigurationType {
  HTTP = 'HTTP',
  MQTT = 'MQTT',
  WEBSOCKET = 'WEBSOCKET',
}

export enum eKerlinkPushConfigurationMsgDetailLevel {
  PAYLOAD = 'PAYLOAD',
  RADIO = 'RADIO',
  NETWORK = 'NETWORK',
}

export type KerlinkPushConfiguration = {
  id: number;
  name: string;
  type: eKerlinkPushConfigurationType;
  msgDetailLevel: eKerlinkPushConfigurationMsgDetailLevel;

  // HTTP / WS
  url?: string;
  user?: string;
  password?: string; // always null
  headers: { key: string; value: string }[];
  tlsCertFileName?: string; // useless
  tlsKeyFileName?: string; // useless
  tlsCaFileName?: string; // useless

  // HTTP
  httpDataUpRoute?: string;
  httpDataDownEventRoute?: string;

  // MQTT
  mqttHost?: string;
  mqttPort?: number;
  mqttTlsEnabled?: boolean;
  mqttClientId?: string;
  mqttConnectionTimeout?: number;
  mqttKeepAlive?: number;
  mqttCleanSession?: boolean;
  mqttQoS?: number;
  mqttUser?: string;
  mqttPassword?: string;
  mqttDataUpTopic?: string;
  mqttDataDownEventTopic?: string;
  mqttWillTopic?: string;
  mqttWillPayload?: string;
  mqttWillQoS?: number;
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

export async function loadKerlinkClusters(): Promise<LoriotApplication[]> {
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
      if (data.length == 0) {
        // No clusters.csv file, let's get clusters from devices
        for (const device of devices) {
          const cluster = data.find(
            (cluster) => cluster.id == device.clusterId
          );
          if (!cluster) {
            // First time for this cluster, save it
            data.push({
              id: device.clusterId,
              name: device.clusterName ?? `Cluster ${device.clusterId}`,
              hexa: true,
              pushEnabled: false,
            });
          }
        }
      }

      console.log(`Found ${data.length} clusters!`);

      const result: KerlinkCluster[] = [];
      for (const clusterCsv of data) {
        // TODO: validate expected fields

        if (clusterCsv.pushConfiguration) {
          clusterCsv.pushConfiguration = JSON.parse(
            (clusterCsv as any).pushConfiguration
          );
        }

        // Recollect devices and push configurations already parsed
        const cluster: KerlinkCluster = {
          id: clusterCsv.id,
          name: clusterCsv.name,
          hexa: clusterCsv.hexa,
          devices: devices.filter((dev) => dev.clusterId == clusterCsv.id),
          pushConfigurations: pushConfigurations.filter(
            (pc) => pc.id == clusterCsv.pushConfiguration?.id
          ),
        };

        result.push(cluster);
      }

      return result;
    }
  );

  console.debug(`Clusters loading complete!`);
  console.debug(`*************************************`);

  /**
   * Translate from Kerlink to LORIOT
   */
  const applications: LoriotApplication[] = [];
  for (const kerlinkCluster of clusters) {
    // Prepare LORIOT device
    const app: LoriotApplication = translateKerlinkCluster(kerlinkCluster);
    // Add device to application list
    applications.push(app);
  }
  return applications;
}

function translateKerlinkCluster(
  kerlinkCluster: KerlinkCluster
): LoriotApplication {
  const app: LoriotApplication = {
    name: kerlinkCluster.name,
    outputs: [],
    devices: [],
  };

  // Translate outputs
  for (const kerlinkPushConfiguration of kerlinkCluster.pushConfigurations) {
    try {
      const out: LoriotOutput = translateKerlinkPushConfigurations(
        kerlinkPushConfiguration,
        kerlinkCluster.hexa
      );
      app.outputs.push(out);
    } catch (err: any) {
      console.log(
        `Unable to translate push configuration "${kerlinkPushConfiguration.name}": ${err.message}`
      );
    }
  }

  // Translate devices
  for (const kerlinkDevice of kerlinkCluster.devices) {
    const dev: LoriotDevice = translateKerlinkDevice(kerlinkDevice);
    app.devices.push(dev);
  }

  return app;
}

function translateKerlinkPushConfigurations(
  kerlinkPushConfiguration: KerlinkPushConfiguration,
  hexa: boolean
): LoriotOutput {
  switch (kerlinkPushConfiguration.type) {
    case eKerlinkPushConfigurationType.HTTP:
      if (!kerlinkPushConfiguration.url) {
        throw new Error(
          `Missing 'url' for Push Configuration ${kerlinkPushConfiguration.id}`
        );
      }

      const out: LoriotHttpKerlinkOutput = {
        output: 'kerlink_http',
        osetup: {
          name: kerlinkPushConfiguration.name,
          verbosity: translateKerlinkVerbosity(
            kerlinkPushConfiguration.msgDetailLevel
          ),
          encoding: hexa
            ? eLoriotKerlinkOutputEncoding.HEXA
            : eLoriotKerlinkOutputEncoding.BASE64,
          url: kerlinkPushConfiguration.url,
          user: kerlinkPushConfiguration.user,
          password: kerlinkPushConfiguration.password,
          dataup_route: kerlinkPushConfiguration.httpDataUpRoute,
          datadownevent_route: kerlinkPushConfiguration.httpDataDownEventRoute,
          custom_headers: kerlinkPushConfiguration.headers,
        },
      };

      return out;
    case 'WEBSOCKET':
    case 'MQTT':
    default:
      throw new Error(
        `Unknown Push Configuration type ${kerlinkPushConfiguration.type}`
      );
  }
}

function translateKerlinkVerbosity(
  msgDetailLevel: eKerlinkPushConfigurationMsgDetailLevel
): eLoriotKerlinkOutputVerbosity {
  switch (msgDetailLevel) {
    case eKerlinkPushConfigurationMsgDetailLevel.RADIO:
      return eLoriotKerlinkOutputVerbosity.RADIO;
    case eKerlinkPushConfigurationMsgDetailLevel.PAYLOAD:
      return eLoriotKerlinkOutputVerbosity.PAYLOAD;
    case eKerlinkPushConfigurationMsgDetailLevel.NETWORK:
      return eLoriotKerlinkOutputVerbosity.NETWORK;
    default:
      throw new Error(`unknown msgDetailLevel ${msgDetailLevel}`);
  }
}

function translateKerlinkDevice(kerlinkDevice: KerlinkDevice): LoriotDevice {
  const splittedMacVersion = kerlinkDevice.macVersion.split('.');
  const lorawan: lorawanVersion = {
    major: Number(splittedMacVersion[0]),
    minor: Number(splittedMacVersion[1]),
    revision: splittedMacVersion[2],
  };

  const dev: LoriotDevice = {
    title: kerlinkDevice.name,
    deveui: kerlinkDevice.devEui,
    devclass: kerlinkDevice.classType as eDeviceClass,
    devActivation: kerlinkDevice.activation as eDeviceActivation,
    devVersion: lorawan.minor == 0 ? eDeviceVersion.v10 : eDeviceVersion.v11,
    lorawan,
    devaddr: addLeadingZeros(kerlinkDevice.dev_addr, 8).toUpperCase(),
    nwkskey: addLeadingZeros(kerlinkDevice.NwkSKey, 32).toUpperCase(),
    appskey: addLeadingZeros(kerlinkDevice.AppSKey, 32).toUpperCase(),
    canSendADR: kerlinkDevice.adrEnabled ?? true,
    rxw:
      kerlinkDevice.rxWindows ??
      (kerlinkDevice.classType == eDeviceClass.C ? 2 : 1), // If class C use RXW2 as default
    rx1Delay: kerlinkDevice.rx1Delay ?? 1,
    seqno: kerlinkDevice.fcntUp ?? 0,
    seqdn: kerlinkDevice.fcntDown ? kerlinkDevice.fcntDown + 1 : 0, // LORIOT will use this value for the next downlink, while kerlink fcntDown is the last used. So increment it +1
    seqq: 0,
  };

  if (dev.devActivation == eDeviceActivation.OTAA) {
    dev.appeui = addLeadingZeros(kerlinkDevice.appEui, 16).toUpperCase();
    dev.appkey = addLeadingZeros(kerlinkDevice.appKey, 32).toUpperCase();
  }

  return dev;
}
