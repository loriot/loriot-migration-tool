import { loadKerlinkClusters } from './kerlink/load-clusters';
import { loadKerlinkFleets } from './kerlink/load-fleets';
import { migrateClusters } from './loriot/import-applications';
import { migrateFleets } from './loriot/import-networks';

(async () => {
  try {
    console.debug(`environment variables:`);
    console.debug(`URL: ${process.env.URL}`);
    console.debug(`AUTH: ${process.env.AUTH}`);
    console.debug(`*************************************`);

    // Load devices from kerlink csv
    const clusters = await loadKerlinkClusters();

    // Load gateways from kerlink csv
    const fleets = await loadKerlinkFleets();

    // Migrate clusters, push configurations and devices
    if (clusters.length > 0) {
      await migrateClusters(clusters);
    }

    // Migrate fleets and gateways
    if (fleets.length > 0) {
      await migrateFleets(fleets);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
