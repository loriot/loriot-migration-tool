import * as grpc from '@grpc/grpc-js';
import { DeviceServiceClient } from '@chirpstack/chirpstack-api/api/device_grpc_pb';
import { DeviceProfileServiceClient } from '@chirpstack/chirpstack-api/api/device_profile_grpc_pb';
import {
  DeviceListItem,
  ListDevicesRequest,
  ListDevicesResponse,
  GetDeviceActivationRequest,
  DeviceActivation,
  GetDeviceActivationResponse,
  GetDeviceRequest,
  GetDeviceResponse,
  GetDeviceKeysRequest,
  GetDeviceKeysResponse,
  Device,
  DeviceKeys,
} from '@chirpstack/chirpstack-api/api/device_pb';
import { GetDeviceProfileRequest, GetDeviceProfileResponse, DeviceProfile } from '@chirpstack/chirpstack-api/api/device_profile_pb';
import { LoriotDevice, eDeviceActivation, eDeviceClass, eDeviceVersion, lorawanVersion } from '../loriot/applications';

const MAC_VERSIONS: lorawanVersion[] = [
  {
    major: 1,
    minor: 0,
    patch: 0,
  },
  {
    major: 1,
    minor: 0,
    patch: 1,
  },
  {
    major: 1,
    minor: 0,
    patch: 2,
  },
  {
    major: 1,
    minor: 0,
    patch: 3,
  },
  {
    major: 1,
    minor: 0,
    patch: 4,
  },
  {
    major: 1,
    minor: 1,
    patch: 1,
  },
];

export async function loadChirpstackDevices(url: string, apiToken: string, applicationId: string): Promise<LoriotDevice[]> {
  console.debug(`Loading devices ...`);
  const loriotDevices: LoriotDevice[] = [];

  // Prepare gRPC services
  const deviceServiceChannel = new DeviceServiceClient(url, grpc.credentials.createInsecure());
  const deviceProfileServiceClient = new DeviceProfileServiceClient(url, grpc.credentials.createInsecure());

  // Load devices list
  const devices = await loadDevices(deviceServiceChannel, apiToken, applicationId);

  const deviceProfiles: Map<string, DeviceProfile.AsObject> = new Map();
  for (const deviceListItem of devices) {
    // Get device object (some params are missing on deviceListItem, e.g. JoinEUI)
    const device: Device.AsObject = await getDevice(deviceServiceChannel, apiToken, deviceListItem.devEui);

    // Get activation params (devaddr, appskey, nwkskey, ...)
    const activation = await getActivation(deviceServiceChannel, apiToken, device.devEui);

    // Get keys (appkey)
    const keys = await getKeys(deviceServiceChannel, apiToken, device.devEui);

    // Get device profile
    var deviceProfile: DeviceProfile.AsObject | undefined = deviceProfiles.get(device.deviceProfileId);
    if (!deviceProfile) {
      deviceProfile = await getDeviceProfile(deviceProfileServiceClient, apiToken, device.deviceProfileId);
      deviceProfiles.set(device.deviceProfileId, deviceProfile);
    }

    // Push device
    loriotDevices.push(await translate(device, activation, keys, deviceProfile));
  }

  console.debug(`Devices loading complete!`);
  console.debug(`*************************************`);
  return loriotDevices;
}

async function loadDevices(channel: DeviceServiceClient, apiToken: string, applicationId: string): Promise<DeviceListItem.AsObject[]> {
  const LIMIT = 10;
  var OFFSET = 0;
  const req = new ListDevicesRequest();
  req.setLimit(LIMIT);
  req.setOffset(OFFSET);
  req.setApplicationId(applicationId);

  var totalCount: number;
  const devices: DeviceListItem.AsObject[] = [];
  do {
    const page = await list(channel, req, apiToken);
    devices.push(...page.resultList);

    // Move to next page
    OFFSET += LIMIT;
    req.setOffset(OFFSET);

    // Repeat until not reach the total count
    totalCount = page.totalCount;
  } while (devices.length < totalCount);

  return devices;
}

async function list(channel: DeviceServiceClient, req: ListDevicesRequest, apiToken: string): Promise<ListDevicesResponse.AsObject> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    channel.list(req, metadata, (err, resp?: ListDevicesResponse) => {
      if (err) {
        reject(err);
      } else if (!resp) {
        reject(new Error(`grpc response undefined`));
      } else {
        resolve(resp.toObject());
      }
    });
  });
}

async function getDevice(channel: DeviceServiceClient, apiToken: string, deveui: string): Promise<Device.AsObject> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    const req: GetDeviceRequest = new GetDeviceRequest();
    req.setDevEui(deveui);

    channel.get(req, metadata, (err, resp?: GetDeviceResponse) => {
      if (err) {
        reject(err);
      } else if (!resp) {
        reject(new Error(`grpc response undefined`));
      } else {
        const device = resp.getDevice();
        if (device) {
          resolve(device.toObject());
        } else {
          reject(new Error(`device not found`));
        }
      }
    });
  });
}

async function getActivation(channel: DeviceServiceClient, apiToken: string, deveui: string): Promise<DeviceActivation.AsObject | undefined> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    const req: GetDeviceActivationRequest = new GetDeviceActivationRequest();
    req.setDevEui(deveui);

    channel.getActivation(req, metadata, (err, resp?: GetDeviceActivationResponse) => {
      if (err) {
        reject(err);
      } else if (!resp) {
        reject(new Error(`grpc response undefined`));
      } else {
        const deviceActivation = resp.getDeviceActivation();
        if (deviceActivation) {
          resolve(deviceActivation.toObject());
        } else {
          // OTAA still not activated
          resolve(undefined);
        }
      }
    });
  });
}

async function getKeys(channel: DeviceServiceClient, apiToken: string, deveui: string): Promise<DeviceKeys.AsObject | undefined> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    const req: GetDeviceKeysRequest = new GetDeviceKeysRequest();
    req.setDevEui(deveui);

    channel.getKeys(req, metadata, (err, resp?: GetDeviceKeysResponse) => {
      if (err) {
        if (err.code == 5) {
          // Object not found: ABP?
          resolve(undefined);
        } else {
          reject(err);
        }
      } else if (!resp) {
        reject(new Error(`grpc response undefined`));
      } else {
        const deviceKeys = resp.getDeviceKeys();
        if (deviceKeys) {
          resolve(deviceKeys.toObject());
        } else {
          reject(new Error(`device keys not found`));
        }
      }
    });
  });
}

async function getDeviceProfile(channel: DeviceProfileServiceClient, apiToken: string, id: string): Promise<DeviceProfile.AsObject> {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.set('authorization', 'Bearer ' + apiToken);

    const req: GetDeviceProfileRequest = new GetDeviceProfileRequest();
    req.setId(id);

    channel.get(req, metadata, (err, resp?: GetDeviceProfileResponse) => {
      if (err) {
        reject(err);
      } else if (!resp) {
        reject(new Error(`grpc response undefined`));
      } else {
        const deviceProfile = resp.getDeviceProfile();
        if (deviceProfile) {
          resolve(deviceProfile.toObject());
        } else {
          reject(new Error(`device profile not found`));
        }
      }
    });
  });
}

async function translate(
  chirpstackDevice: Device.AsObject,
  activation: DeviceActivation.AsObject | undefined,
  keys: DeviceKeys.AsObject | undefined,
  deviceProfile: DeviceProfile.AsObject
): Promise<LoriotDevice> {
  const lorawan = MAC_VERSIONS[deviceProfile.macVersion];

  const dev: LoriotDevice = {
    title: chirpstackDevice.name ? chirpstackDevice.name.toString() : chirpstackDevice.devEui?.toUpperCase(),
    deveui: chirpstackDevice.devEui?.toUpperCase(),
    devclass: deviceProfile.supportsClassC ? eDeviceClass.C : eDeviceClass.A,
    devVersion: lorawan.minor == 0 ? eDeviceVersion.v10 : eDeviceVersion.v11,
    devActivation: deviceProfile.supportsOtaa ? eDeviceActivation.OTAA : eDeviceActivation.ABP,
    devaddr: activation?.devAddr?.toUpperCase(),
    appeui: chirpstackDevice.joinEui?.toUpperCase(),
    appkey: keys?.nwkKey, // Network root key (128 bit). Note: For LoRaWAN 1.0.x, use this field for the LoRaWAN 1.0.x 'AppKey`!
    nwkskey: activation?.nwkSEncKey?.toUpperCase(),
    appskey: activation?.appSKey?.toUpperCase(),
    canSendADR: true,
    rxw: 1, // Not configurable on ChirpStack
    rx1Delay: 1,
    seqno: 0, // TODO
    seqdn: 0, // TODO
    seqq: 0,
  };

  return dev;
}
