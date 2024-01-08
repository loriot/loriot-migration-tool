import { loadKerlinkDevicesFromCsv } from './kerlink/load-csv';
import { importDevicesToLoriot } from './loriot/import-devices';

(async () => {
  try {
    // Load devices from kerlink csv
    const devices = await loadKerlinkDevicesFromCsv('./data/devices.csv');

    // Import devices to LORIOT
    await importDevicesToLoriot(devices);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
