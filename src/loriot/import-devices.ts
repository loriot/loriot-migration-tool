import { KerlinkDevice } from '../kerlink/load-csv';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';

type LoriotApplication = {
  name: string;
  devices: LoriotDevice[];
};

type LoriotDevice = {
  name: string;
  deveui: string;
};

export async function importDevicesToLoriot(devices: KerlinkDevice[]) {
  console.debug(`Importing devices to LORIOT ...`);
  console.debug(`| URL: ${process.env.URL}`);
  console.debug(`| AUTH: ${process.env.AUTH}`);

  const apps: Map<number, LoriotApplication> = new Map(); // key: clusterId
  for (const device of devices) {
    // Prepare LORIOT application
    var app = apps.get(device.clusterId);
    if (!app) {
      // First time for this cluster, so create LORIOT application
      app = {
        name: device.clusterName,
        devices: [],
      };
      apps.set(device.clusterId, app);
    }

    // Prepare LORIOT device
    const dev: LoriotDevice = {
      name: device.name,
      deveui: device.devEui,
    };

    // Add device to application list
    app.devices.push(dev);
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

async function createDevice(appId: string, dev: LoriotDevice): Promise<string> {
  return axios
    .post(
      `https://${process.env.URL}/1/nwk/app/${appId}/devices`,
      {
        title: dev.name,
        deveui: dev.deveui,
      },
      {
        headers: { Authorization: process.env.AUTH },
      }
    )
    .then((res: AxiosResponse) => {
      return res.data._id.toString(16).toUpperCase();
    });
}
