import { loadKerlinkClusters } from './kerlink/load-clusters';
import { importDevicesToLoriot } from './loriot/import-devices';

(async () => {
  try {
    // Load devices from kerlink csv
    const clusters = await loadKerlinkClusters();
    console.log(clusters);

    // Import devices to LORIOT
    // await importDevicesToLoriot(devices);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
