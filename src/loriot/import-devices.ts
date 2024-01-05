import { KerlinkDevice } from '../kerlink/load-csv';

type LoriotApplication = {
    name: string,
    devices: LoriotDevice[]
}

type LoriotDevice = {
    name: string,
    deveui: string
}

export function importDevices(devices: KerlinkDevice[]) {
    const apps: Map<number,LoriotApplication> = new Map(); // key: clusterId
    for (const device of devices) {
        // Get LORIOT application
        var app = apps.get(device.clusterId);
        if (!app) {
            // First time for this cluster, so create LORIOT application
            app = {
                name: device.clusterName,
                devices: []    
            }
            apps.set(device.clusterId, app);
        }

        // Create LORIOT device
        const dev: LoriotDevice = {
            name: device.name,
            deveui: device.devEui
        }

        // Add device to application list
        app.devices.push(dev);
    }
    
    console.log(JSON.stringify(Array.from(apps.values())));
}