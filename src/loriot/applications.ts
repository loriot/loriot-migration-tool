import axios, { AxiosError, AxiosResponse } from 'axios';
import { getErrorMessage } from '../utils';

export type LoriotApplication = {
  name: string;
  outputs: LoriotOutput[];
  devices: LoriotDevice[];
};

export interface LoriotOutput {
  output: string;
  osetup: any;
}

export interface LoriotHTTPOutput extends LoriotOutput {
  output: 'httppush';
  osetup: {
    name: string;
    url: string;
  };
}

export enum eLoriotKerlinkOutputType {
  HTTP = 'kerlink_http',
  MQTT = 'kerlink_mqtt',
  WEBSOCKET = 'kerlink_websocket',
}

export enum eLoriotKerlinkOutputVerbosity {
  PAYLOAD = 'Payload',
  RADIO = 'Radio',
  NETWORK = 'Network',
}

export enum eLoriotKerlinkOutputEncoding {
  HEXA = 'HEXA',
  BASE64 = 'BASE64',
}

export interface LoriotHttpKerlinkOutput extends LoriotOutput {
  output: 'kerlink_http';
  osetup: {
    name?: string;
    verbosity: eLoriotKerlinkOutputVerbosity;
    encoding: eLoriotKerlinkOutputEncoding;
    url: string;
    user?: string;
    password?: string;
    dataup_route?: string;
    datadownevent_route?: string;
    cert?: string; // Not exported by WMC
    key?: string; // Not exported by WMC
    ca?: string; // Not exported by WMC
    custom_headers?: { key: string; value: string }[];
  };
}

export interface LoriotWebsocketKerlinkOutput extends LoriotOutput {
  output: 'kerlink_websocket';
  osetup: {
    name?: string;
    verbosity: eLoriotKerlinkOutputVerbosity;
    encoding: eLoriotKerlinkOutputEncoding;
    url: string;
    user?: string;
    password?: string;
    cert?: string; // Not exported by WMC
    key?: string; // Not exported by WMC
    ca?: string; // Not exported by WMC
    custom_headers?: { key: string; value: string }[];
  };
}

export type LoriotDevice = {
  title: string;
  deveui: string;
  devclass: eDeviceClass;
  devVersion: eDeviceVersion;
  devActivation: eDeviceActivation;
  lorawan: lorawanVersion;
  appkey?: string;
  appeui?: string;
  devaddr?: string;
  nwkskey?: string;
  appskey?: string;
  canSendADR: boolean;
  rxw: number;
  rx1Delay: number;
  seqno: number;
  seqdn: number;
  seqq: number;
};

export type lorawanVersion = { major: number; minor: number; revision: string };

export enum eDeviceClass {
  A = 'A',
  C = 'C',
}

export enum eDeviceVersion {
  v10 = 'v1.0',
  v11 = 'v1.1',
}

export enum eDeviceActivation {
  ABP = 'ABP',
  OTAA = 'OTAA',
}

export async function importApplications(applications: LoriotApplication[]) {
  console.debug(`Importing applications to LORIOT ...`);

  /**
   * Call LORIOT API to create recourses
   */
  for (const app of applications) {
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
          console.debug(
            `[${app.name}][OUT][${out.osetup.name}] Creating output ...`
          );
          await createOutput(appId, out);
          console.debug(
            `[${app.name}][OUT][${out.osetup.name}] Output created!`
          );
        } catch (err: any) {
          console.error(
            `[${app.name}][OUT][${
              out.osetup.name
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

  console.debug(`Applications migration complete!`);
  console.debug(`*************************************`);
}

async function getApp(app: LoriotApplication): Promise<string> {
  return axios
    .get(`https://${process.env.URL}/1/nwk/apps?filter=name=${app.name}`, {
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
        capacity: app.devices.length > 0 ? app.devices.length : 1,
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
    out,
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
      `https://${
        process.env.URL
      }/1/nwk/app/${appId}/device/${dev.deveui.toUpperCase()}`,
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
