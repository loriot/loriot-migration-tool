import {
  KerlinkCluster,
  KerlinkDevice,
  KerlinkPushConfiguration,
} from '../kerlink/load-clusters';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { addLeadingZeros, getErrorMessage } from '../utils';

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
  title: string;
  deveui: string;
  devclass: eDeviceClass;
  devVersion: eDeviceVersion;
  devActivation: eDeviceActivation;
  lorawan: lorawanVersion;
  appkey?: string;
  appeui?: string;
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
      // Check if application already exists on LORIOT (by Name) to support multiple import attempts
      var appId = await getApp(app);
      if (!appId) {
        // Create application
        console.debug(`[${app.name}] Creating application ...`);
        appId = await createApp(app);
        console.debug(`[${app.name}] Application created!`);
      } else {
        console.debug(
          `[${app.name}] Reusing already existing application ${appId}!`
        );
      }

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
          // Delete device if already exists
          try {
            console.debug(
              `[${app.name}][DEV][${dev.deveui}] Check if already exisiting ...`
            );
            await deleteDevice(appId, dev);
            console.debug(`[${app.name}][DEV][${dev.deveui}] Device deleted!`);
          } catch (err: any) {
            console.error(
              `[${app.name}][DEV][${
                dev.deveui
              }] Device deletion error: ${getErrorMessage(err)}`
            );
          }

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

async function getApp(app: LoriotApplication): Promise<string> {
  return axios
    .get(`https://${process.env.URL}/1/nwk/apps?filter=name~${app.name}`, {
      headers: { Authorization: process.env.AUTH },
    })
    .then((res: AxiosResponse) => {
      if (res.data.apps.length > 0) {
        return res.data.apps[0]._id.toString(16).toUpperCase();
      } else {
        return undefined;
      }
    });
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

async function deleteDevice(
  appId: string,
  dev: LoriotDevice
): Promise<boolean> {
  return axios
    .delete(
      `https://${process.env.URL}/1/nwk/app/${appId}/device/${dev.deveui}`,
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then(
      async (res: AxiosResponse) => {
        return true;
      },
      (err: Error) => {
        if ((err as AxiosError).response?.status == 404) {
          // Device doesn't exist
          return false;
        } else {
          throw err;
        }
      }
    );
}

async function createDevice(appId: string, dev: LoriotDevice): Promise<string> {
  return axios
    .post(
      `https://${process.env.URL}/1/nwk/app/${appId}/devices/${dev.devActivation}`,
      dev,
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then((res: AxiosResponse) => {
      return res.data._id.toString(16).toUpperCase();
    });
}
