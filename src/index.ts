import { loadKerlinkClusters } from './kerlink/load-clusters';
import { importDevicesToLoriot } from './loriot/import-devices';

(async () => {
  try {
    // Load devices from kerlink csv
    const clusters = await loadKerlinkClusters();

    // Migrate devices
    if (clusters.length > 0) {
      await importDevicesToLoriot(clusters);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
