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

export interface LoriotMqttKerlinkOutput extends LoriotOutput {
  output: 'kerlink_mqtt';
  osetup: {
    name?: string;
    verbosity: eLoriotKerlinkOutputVerbosity;
    encoding: eLoriotKerlinkOutputEncoding;
    host: string;
    port: number;
    clientid?: string;
    timeout: number;
    keepalive: number;
    tls: 0 | 1;
    clean: 0 | 1;
    user?: string;
    password?: string;
    cert?: string; // Not exported by WMC
    key?: string; // Not exported by WMC
    ca?: string; // Not exported by WMC
    dataup_topic?: string;
    datadownevent_topic?: string;
    qos: number;
    will_topic?: string;
    will_payload?: string;
    will_qos?: number;
  };
}

export type LoriotDevice = {
  title: string;
  description?: string;
  deveui: string;
  devclass: eDeviceClass;
  devVersion: eDeviceVersion;
  devActivation: eDeviceActivation;
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

export type lorawanVersion = { major: number; minor: number; patch: number };

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
      // Create application
      const appId = await createApp(app);
      console.debug(`[${app.name}] Application created`);

      // Create outputs
      for (const out of app.outputs) {
        try {
          // Create output
          await createOutput(appId, out);
          console.debug(
            `[${app.name}][OUT][${out.osetup.name}] Output created`
          );
        } catch (err: any) {
          console.error(
            `[${app.name}][OUT][${
              out.osetup.name
            }] Output creation error: ${getErrorMessage(err)}`
          );
          console.debug(out);
        }
      }

      // Create devices
      for (const dev of app.devices) {
        try {
          // Create device
          await createDevice(appId, dev);
          console.debug(`[${app.name}][DEV][${dev.deveui}] Device created`);
        } catch (err: any) {
          console.error(
            `[${app.name}][DEV][${
              dev.deveui
            }] Device creation error: ${getErrorMessage(err)}`
          );
          console.debug(dev);
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
