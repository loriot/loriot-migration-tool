import {
  LoriotApplication,
  LoriotDevice,
  LoriotHttpKerlinkOutput,
  LoriotMqttKerlinkOutput,
  LoriotOutput,
  LoriotWebsocketKerlinkOutput,
  eDeviceActivation,
  eDeviceClass,
  eDeviceVersion,
  eLoriotKerlinkOutputEncoding,
  eLoriotKerlinkOutputVerbosity,
  lorawanVersion,
} from '../loriot/applications';
import { addLeadingZeros, loadCsvFile, randomHex } from '../utils';

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
  activation: eDeviceActivation;
  appEui: string;
  appKey: string;
  fcntDown: number;
  fcntUp: number;
  rx1Delay: number;
  rxWindows?: string;
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
  console.debug(`Translating clusters into LORIOT applications ...`);
  const applications: LoriotApplication[] = [];
  for (const kerlinkCluster of clusters) {
    // Prepare LORIOT device
    const app: LoriotApplication = translateKerlinkCluster(kerlinkCluster);
    // Add device to application list
    applications.push(app);
  }

  console.debug(`Clusters translation complete!`);
  console.debug(`*************************************`);

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
        `Unable to translate push configuration ${kerlinkPushConfiguration.id} "${kerlinkPushConfiguration.name}": ${err.message}`
      );
    }
  }

  // Translate devices
  for (const kerlinkDevice of kerlinkCluster.devices) {
    try {
      const dev: LoriotDevice = translateKerlinkDevice(kerlinkDevice);
      app.devices.push(dev);
    } catch (err: any) {
      console.log(
        `Unable to translate device "${kerlinkDevice.devEui}": ${err.message}`
      );
    }
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
        throw new Error(`Missing 'url'`);
      }

      const http: LoriotHttpKerlinkOutput = {
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

      return http;
    case eKerlinkPushConfigurationType.WEBSOCKET:
      if (!kerlinkPushConfiguration.url) {
        throw new Error(`Missing 'url'`);
      }

      const ws: LoriotWebsocketKerlinkOutput = {
        output: 'kerlink_websocket',
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
          custom_headers: kerlinkPushConfiguration.headers,
        },
      };

      return ws;
    case eKerlinkPushConfigurationType.MQTT:
      if (!kerlinkPushConfiguration.mqttHost) {
        throw new Error(`Missing 'mqttHost'`);
      }

      const mqtt: LoriotMqttKerlinkOutput = {
        output: 'kerlink_mqtt',
        osetup: {
          name: kerlinkPushConfiguration.name,
          verbosity: translateKerlinkVerbosity(
            kerlinkPushConfiguration.msgDetailLevel
          ),
          encoding: hexa
            ? eLoriotKerlinkOutputEncoding.HEXA
            : eLoriotKerlinkOutputEncoding.BASE64,
          host: kerlinkPushConfiguration.mqttHost,
          port: kerlinkPushConfiguration.mqttPort ?? 1883,
          clientid: kerlinkPushConfiguration.mqttClientId,
          timeout: kerlinkPushConfiguration.mqttConnectionTimeout ?? 30,
          keepalive: kerlinkPushConfiguration.mqttKeepAlive ?? 30,
          tls: kerlinkPushConfiguration.mqttTlsEnabled ? 1 : 0,
          clean: kerlinkPushConfiguration.mqttCleanSession ? 1 : 0,
          user: kerlinkPushConfiguration.user,
          password: kerlinkPushConfiguration.password,
          dataup_topic: kerlinkPushConfiguration.mqttDataUpTopic,
          datadownevent_topic: kerlinkPushConfiguration.mqttDataDownEventTopic,
          qos: kerlinkPushConfiguration.mqttQoS ?? 0,
          will_topic: kerlinkPushConfiguration.mqttWillTopic,
          will_payload: kerlinkPushConfiguration.mqttWillPayload,
          will_qos: kerlinkPushConfiguration.mqttWillQoS,
        },
      };

      return mqtt;
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
  if (!['A', 'C'].includes(kerlinkDevice.classType.toUpperCase())) {
    throw new Error(`unsupported classType: ${kerlinkDevice.classType}`);
  }

  // LoRaWAN Version
  var lorawan: lorawanVersion;
  try {
    const splittedMacVersion = kerlinkDevice.macVersion.split('.');
    lorawan = {
      major: Number(splittedMacVersion[0]),
      minor: Number(splittedMacVersion[1]),
      patch: Number(splittedMacVersion[2]),
    };
  } catch (err: any) {
    throw new Error(
      `Unable to parse macVersion ${kerlinkDevice.macVersion}: ${err.message}`
    );
  }

  // DevAddr
  var devaddr: string | undefined;
  if (kerlinkDevice.dev_addr) {
    try {
      devaddr = addLeadingZeros(kerlinkDevice.dev_addr, 8).toUpperCase();
    } catch (err: any) {
      throw new Error(
        `Unable to parse dev_addr ${kerlinkDevice.dev_addr}: ${err.message}`
      );
    }
  } else {
    // devaddr undefined
    if (kerlinkDevice.activation == eDeviceActivation.ABP) {
      throw new Error(`dev_addr is required for ABP device`);
    }
  }

  // NwkSKey
  var nwkskey: string | undefined;
  if (kerlinkDevice.NwkSKey) {
    try {
      nwkskey = addLeadingZeros(kerlinkDevice.NwkSKey, 32).toUpperCase();
    } catch (err: any) {
      throw new Error(
        `Unable to parse NwkSKey ${kerlinkDevice.NwkSKey}: ${err.message}`
      );
    }
  } else {
    // NwkSKey undefined
    if (kerlinkDevice.activation == eDeviceActivation.ABP) {
      throw new Error(`NwkSKey is required for ABP device`);
    }
  }

  // AppSKey
  var appskey: string | undefined;
  if (kerlinkDevice.AppSKey) {
    try {
      appskey = addLeadingZeros(kerlinkDevice.AppSKey, 32).toUpperCase();
    } catch (err: any) {
      throw new Error(
        `Unable to parse AppSKey ${kerlinkDevice.AppSKey}: ${err.message}`
      );
    }
  }

  const dev: LoriotDevice = {
    title: kerlinkDevice.name
      ? kerlinkDevice.name.toString()
      : kerlinkDevice.devEui,
    deveui: kerlinkDevice.devEui,
    devclass: kerlinkDevice.classType as eDeviceClass,
    devActivation: kerlinkDevice.activation as eDeviceActivation,
    devVersion: lorawan.minor == 0 ? eDeviceVersion.v10 : eDeviceVersion.v11,
    devaddr,
    nwkskey,
    appskey,
    canSendADR: kerlinkDevice.adrEnabled ?? true,
    rxw:
      kerlinkDevice.rxWindows == 'AUTO'
        ? 0
        : kerlinkDevice.classType == eDeviceClass.C
        ? 2 // If class C use RXW2 as default
        : 1,
    rx1Delay: kerlinkDevice.rx1Delay ?? 1,
    seqno: kerlinkDevice.fcntUp ?? 0,
    seqdn: kerlinkDevice.fcntDown ? kerlinkDevice.fcntDown + 1 : 0, // LORIOT will use this value for the next downlink, while kerlink fcntDown is the last used. So increment it +1
    seqq: 0,
  };

  if (dev.devActivation == eDeviceActivation.OTAA) {
    // JoinEUI
    if (kerlinkDevice.appEui) {
      try {
        dev.appeui = addLeadingZeros(kerlinkDevice.appEui, 16).toUpperCase();
      } catch (err: any) {
        throw new Error(
          `Unable to parse appEui ${kerlinkDevice.appEui}: ${err.message}`
        );
      }
    } else {
      // JoinEUI undefined for OTAA device
      throw new Error(`appEui is required for OTAA device`);
    }

    // AppKey
    if (kerlinkDevice.appKey) {
      try {
        dev.appkey = addLeadingZeros(kerlinkDevice.appKey, 32).toUpperCase();
      } catch (err: any) {
        throw new Error(
          `Unable to parse appKey ${kerlinkDevice.appKey}: ${err.message}`
        );
      }
    } else {
      // AppKey undefined for OTAA device
      throw new Error(`appkey is required for OTAA device`);
    }
  }

  // Check if title is too long
  if (dev.title.length >= 50) {
    // Save it as description but truncate to 50 chars
    dev.description = dev.title;
    dev.title = dev.title.substring(0, 50);
    console.warn(`${dev.deveui} title too long: truncated to ${dev.title}`);
  }

  return dev;
}
