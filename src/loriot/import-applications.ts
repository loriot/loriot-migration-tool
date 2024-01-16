import {
  KerlinkCluster,
  KerlinkDevice,
  KerlinkPushConfiguration,
} from '../kerlink/load-clusters';
import axios, { AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';

type LoriotApplication = {
  name: string;
  outputs: LoriotOutput[];
  devices: LoriotDevice[];
};

type LoriotOutput = {
  name: string;
  url: string;
};

type LoriotDevice = {
  name: string;
  deveui: string;
  devclass: eDeviceClass;
  devVersion: eDeviceVersion;
  devActivation: eDeviceActivation;
  lorawan: lorawanVersion;
  appkey: string;
  appeui: string;
  devaddr: string;
  nwkskey: string;
  appskey: string;
  canSendADR: boolean;
  rxw: number;
  rx1Delay: number;
  seqno: number;
  seqdn: number;
  seqq: number;
};

type lorawanVersion = { major: number; minor: number; revision: string };

enum eDeviceClass {
  A = 'A',
  C = 'C',
}

enum eDeviceVersion {
  v10 = 'v1.0',
  v11 = 'v1.1',
}

enum eDeviceActivation {
  ABP = 'ABP',
  OTAA = 'OTAA',
}

export async function migrateClusters(kerlinkClusters: KerlinkCluster[]) {
  console.debug(`Migrating clusters to LORIOT ...`);

  /**
   * Translate from Kerlink to LORIOT
   */
  const apps: LoriotApplication[] = [];
  for (const kerlinkCluster of kerlinkClusters) {
    // Prepare LORIOT device
    const app: LoriotApplication = translateKerlinkCluster(kerlinkCluster);
    // Add device to application list
    apps.push(app);
  }

  /**
   * Call LORIOT API to create recourses
   */
  for (const app of apps) {
    try {
      // Create application
      console.debug(`[${app.name}] Creating application ...`);
      const appId = await createApp(app);
      console.debug(`[${app.name}] Application created!`);

      // Create outputs
      for (const out of app.outputs) {
        try {
          console.debug(`[${app.name}][OUT][${out.name}] Creating output ...`);
          await createOutput(appId, out);
          console.debug(`[${app.name}][OUT][${out.name}] Output created!`);
        } catch (err: any) {
          console.error(
            `[${app.name}][OUT][${
              out.name
            }] Output creation error: ${getErrorMessage(err)}`
          );
        }
      }

      // Create devices
      for (const dev of app.devices) {
        try {
          console.debug(
            `[${app.name}][DEV][${dev.deveui}] Creating device ...`
          );
          await createDevice(appId, dev);
          console.debug(`[${app.name}][DEV][${dev.deveui}] Device created!`);
        } catch (err: any) {
          console.error(
            `[${app.name}][DEV][${
              dev.deveui
            }] Device creation error: ${getErrorMessage(err)}`
          );
        }
      }
    } catch (err: any) {
      console.error(
        `[${app.name}] Application creation error: ${getErrorMessage(err)}`
      );
    }
  }

  console.debug(`Clusters migration complete!`);
  console.debug(`*************************************`);
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
    const out: LoriotOutput = translateKerlinkPushConfigurations(
      kerlinkPushConfiguration
    );
    app.outputs.push(out);
  }

  // Translate devices
  for (const kerlinkDevice of kerlinkCluster.devices) {
    const dev: LoriotDevice = translateKerlinkDevice(kerlinkDevice);
    app.devices.push(dev);
  }

  return app;
}

function translateKerlinkPushConfigurations(
  kerlinkPushConfiguration: KerlinkPushConfiguration
): LoriotOutput {
  // only minimal HTTP supported
  // TODO: support headers, certs and MQTT
  return {
    name: kerlinkPushConfiguration.name,
    url: kerlinkPushConfiguration.url,
  };
}

function translateKerlinkDevice(kerlinkDevice: KerlinkDevice): LoriotDevice {
  const splittedMacVersion = kerlinkDevice.macVersion.split('.');
  const lorawan: lorawanVersion = {
    major: Number(splittedMacVersion[0]),
    minor: Number(splittedMacVersion[1]),
    revision: splittedMacVersion[2],
  };

  const dev: LoriotDevice = {
    name: kerlinkDevice.name,
    deveui: kerlinkDevice.devEui,
    devclass: kerlinkDevice.classType as eDeviceClass,
    devActivation: kerlinkDevice.activation as eDeviceActivation,
    devVersion: lorawan.minor == 0 ? eDeviceVersion.v10 : eDeviceVersion.v11,
    lorawan,
    appkey: kerlinkDevice.appKey,
    appeui: kerlinkDevice.appEui,
    devaddr: kerlinkDevice.dev_addr,
    nwkskey: kerlinkDevice.NwkSKey,
    appskey: kerlinkDevice.AppSKey,
    canSendADR: kerlinkDevice.adrEnabled,
    rxw: kerlinkDevice.rxWindows,
    rx1Delay: kerlinkDevice.rx1Delay,
    seqno: kerlinkDevice.fcntUp,
    seqdn: kerlinkDevice.fcntDown,
    seqq: 0,
  };

  return dev;
}

async function createApp(app: LoriotApplication): Promise<string> {
  return axios
    .post(
      `https://${process.env.URL}/1/nwk/apps`,
      {
        title: app.name,
        capacity: app.devices.length,
        visibility: 'private',
        mcastdevlimit: 0,
      },
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then((res: AxiosResponse) => {
      return res.data._id.toString(16).toUpperCase();
    });
}

async function createOutput(appId: string, out: LoriotOutput): Promise<string> {
  return axios.post(
    `https://${process.env.URL}/1/nwk/app/${appId}/outputs`,
    {
      output: 'httppush',
      osetup: {
        name: out.name,
        url: out.url,
      },
    },
    {
      headers: { Authorization: process.env.AUTH },
    }
  );
}

async function createDevice(appId: string, dev: LoriotDevice): Promise<string> {
  return axios
    .post(`https://${process.env.URL}/1/nwk/app/${appId}/devices`, dev, {
      headers: { Authorization: process.env.AUTH },
    })
    .then((res: AxiosResponse) => {
      return res.data._id.toString(16).toUpperCase();
    });
}
