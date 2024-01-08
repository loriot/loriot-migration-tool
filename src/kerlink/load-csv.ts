import csv from 'csvtojson';

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

export async function loadKerlinkDevicesFromCsv(
  path: string
): Promise<KerlinkDevice[]> {
  console.log(`Loading kerlink devices from ${path} ...`);

  return csv()
    .fromFile(path)
    .then((data: any[]) => {
      console.log(`Found ${data.length} devices!`);

      // TODO: cast and validate CSV fields
      for (const device of data) {
        device.adrEnabled = device.adrEnabled == 'true';
        device.rxWindows = Number(device.rxWindows);
        device.rx1Delay = Number(device.rx1Delay);
        device.fcntUp = Number(device.fcntUp);
        device.fcntDown = Number(device.fcntDown);
      }

      return data;
    });
}
