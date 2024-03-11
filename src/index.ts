import { loadKerlinkClusters } from './kerlink/clusters';
import { loadKerlinkFleets } from './kerlink/fleets';
import { importApplications } from './loriot/applications';
import { importNetworks } from './loriot/networks';

(async () => {
  try {
    console.debug(`environment variables:`);
    console.debug(`URL: ${process.env.URL}`);
    console.debug(`AUTH: ${process.env.AUTH}`);
    console.debug(`*************************************`);

    // Load devices from kerlink csv
    const applications = await loadKerlinkClusters();

    // Load gateways from kerlink csv
    const networks = await loadKerlinkFleets();

    if (applications.length > 0) {
      await importApplications(applications);
    }
    if (networks.length > 0) {
      await importNetworks(networks);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
