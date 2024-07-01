import { loadChirpstackApplications } from './chirpstack/applications';
import { loadChirpstackGateways } from './chirpstack/gateways';
import { loadKerlinkClusters } from './kerlink/clusters';
import { loadKerlinkFleets } from './kerlink/fleets';
import { LoriotApplication, importApplications } from './loriot/applications';
import { LoriotNetwork, importNetworks } from './loriot/networks';

(async () => {
  console.log(`LORIOT Migration Tool v${require('../package.json').version}`);
  console.log(``);

  try {
    var applications: LoriotApplication[] = [];
    var networks: LoriotNetwork[] = [];
    if (
      process.env.CHIRPSTACK_URL &&
      process.env.CHIRPSTACK_API_TOKEN &&
      process.env.CHIRPSTACK_TENANT_ID
    ) {
      // CHIRPSTACK
      console.debug(`************* CHIRPSTACK *************`);

      applications = await loadChirpstackApplications(
        process.env.CHIRPSTACK_URL,
        process.env.CHIRPSTACK_API_TOKEN,
        process.env.CHIRPSTACK_TENANT_ID
      );
      networks = [
        await loadChirpstackGateways(
          process.env.CHIRPSTACK_URL,
          process.env.CHIRPSTACK_API_TOKEN,
          process.env.CHIRPSTACK_TENANT_ID
        ),
      ];
    } else {
      // KERLINK
      console.debug(`************* KERLINK *************`);

      applications = await loadKerlinkClusters();
      networks = await loadKerlinkFleets();
    }

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
