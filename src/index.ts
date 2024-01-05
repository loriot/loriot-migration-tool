import { loadDevices } from './kerlink/load-csv';
import { importDevices } from './loriot/import-devices';

(async () => {
    try {
        // Load devices from kerlink csv
        const devices = await loadDevices('./data/devices.csv');
        
        // Import devices to LORIOT
        importDevices(devices);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();