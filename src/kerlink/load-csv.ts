import csv from 'csvtojson';

export type KerlinkDevice = {
  extraction_date: Date;
  customerId: string;
  customerName: string;
  clusterId: number;
  clusterName: string;
  devEui: string;
  name: string;
  classType: string;
  rfRegions: string;
  country: string;
  macVersion: string;
  regParamsRevision: string;
  profile: string;
  adrEnabled: boolean;
  activation: 'OTAA' | 'ABP';
  appEui: string;
  appKey: string;
  fcntDown: number;
  fcntUp: number;
  devNonceCounter: string;
  fNwkSIntKey: string;
  sNwkSIntKey: string;
  rx1Delay: number;
  rx1DrOffset: number;
  rx2Dr: number;
  rx2Freq: number;
  rxWindows: number;
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
  dev_addr: string;
  NwkSKey: string;
  AppSKey: string;
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
