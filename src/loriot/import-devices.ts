import { KerlinkDevice } from '../kerlink/load-clusters';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';

type LoriotApplication = {
  name: string;
  devices: LoriotDevice[];
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

export async function importDevicesToLoriot(kerlinkDevices: KerlinkDevice[]) {
  console.debug(`Importing devices to LORIOT ...`);
  console.debug(`| URL: ${process.env.URL}`);
  console.debug(`| AUTH: ${process.env.AUTH}`);

  const apps: Map<number, LoriotApplication> = new Map(); // key: clusterId
  for (const kerlinkDevice of kerlinkDevices) {
    // Prepare LORIOT application
    var app = apps.get(kerlinkDevice.clusterId);
    if (!app) {
      // First time for this cluster, so create LORIOT application
      app = {
        name: kerlinkDevice.clusterName,
        devices: [],
      };
      apps.set(kerlinkDevice.clusterId, app);
    }

    try {
      // Prepare LORIOT device
      const dev: LoriotDevice = translateFromKerlinkDevice(kerlinkDevice);
      // Add device to application list
      app.devices.push(dev);
    } catch (err: any) {
      // Unable to parse kerlink device
      console.error(
        `[${app.name}][${
          kerlinkDevice.devEui
        }] Device parsing error: ${getErrorMessage(err)}`
      );
    }
  }

  // Create LORIOT applications
  for (const app of Array.from(apps.values())) {
    try {
      console.debug(`[${app.name}] Creating application ...`);
      const appId = await createApp(app);
      console.debug(`[${app.name}] Application created!`);

      // Create LORIOT devices
      for (const dev of app.devices) {
        try {
          console.debug(`[${app.name}][${dev.deveui}] Creating device ...`);
          await createDevice(appId, dev);
          console.debug(`[${app.name}][${dev.deveui}] Device created!`);
        } catch (err: any) {
          console.error(
            `[${app.name}][${
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

  console.debug(`Importing devices to LORIOT completed!`);
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

function translateFromKerlinkDevice(
  kerlinkDevice: KerlinkDevice
): LoriotDevice {
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

async function createDevice(appId: string, dev: LoriotDevice): Promise<string> {
  return axios
    .post(`https://${process.env.URL}/1/nwk/app/${appId}/devices`, dev, {
      headers: { Authorization: process.env.AUTH },
    })
    .then((res: AxiosResponse) => {
      return res.data._id.toString(16).toUpperCase();
    });
}
