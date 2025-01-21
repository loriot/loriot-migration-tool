# LORIOT Migration Tool
PoC tool to migrate resources to LORIOT NMS

## Requirements
- [Docker Desktop](https://docs.docker.com/desktop/) or [Docker Engine](https://docs.docker.com/engine/) and [Docker Compose](https://docs.docker.com/compose/)
- [LORIOT API Token](https://docs.loriot.io/display/NMS/Create+an+API+key)

### Kerlink WMC
- `.csv` files exported from Kerlink WMC
  - For devices migration:
    - `./data/clusters.csv` (optional: if not provied, clusters are taken from `devices.csv`)
    - `./data/pushConfigurations.csv` (optional)
    - `./data/devices.csv` (extended with `dev_addr`, `AppSKey` and `NwkSKey` columns to avoid rejoin procedures)
  - For gateways migration:
    - `./data/fleets.csv`
    - (SKIP IF MIGRATE VIA KERLINK ZTP) `./data/gateways.csv` (extended with `eth0MAC` column)

### ChirpStack
- ChirpStack API Token
- ChirpStack Tenant ID

## Usage

### Kerlink WMC
1. Place `.csv` files in `./data` folder
2. Edit `.env.kerlink` file
  - `URL`: LORIOT NMS URL (example: `eu1.loriot.io`)
  - `AUTH`: LORIOT API authorization header (example: `Bearer AAAAAgvm9WBrwSdUFQ7_SB1ItnTnxbJDfXE6RjbUBNdeVmfG8`)
  - `CLEAN`: Set to `1` to delete existing resources on LORIOT if to import. Useful for cleaning previous import intents.
  - `IMPORT`: Set to `0` to disable the import. Useful for evaluating only the CSV files.
  - `CUSTOMERID`: Set Kerlink Customer ID to filter specific customer resources. Useful to migrate resources by customer without editing the csv files.
3. `docker compose -f docker-compose.kerlink.yaml build && docker compose -f docker-compose.kerlink.yaml up`

#### NOTE
- From WMC it's not possible to export OTAA device session keys (devaddr, appskey and nwkskey). That's why it's required to manually extend `devices.csv` to avoid rejoin procedures (Kerlink support should be able to provide them). However, it's strongly recommended to perform a new join procedure changing Network Server.
- Gateway eth0 MAC address is used by LORIOT as gateway unique identifier but it's not exportable from WMC. So `eth0MAC` coulmn is required in `gateways.csv` if not using Kerlink ZTP.
- WMC Push Configuration sensible data (user, password, tlsCertFileName, tlsKeyFileName, mqttPassword, ...) are not exportable from WMC. If needed, please manually fill them in `pushConfigurations.csv`.
- According to the exported `description` field in `gateways.csv`, the gateways are mapped as follows:

| WMC  | LORIOT |
| ------------- | ------------- |
| Wirnet iStation  | Kerlink iStation |
| Wirnet iFemtoCell  | Kerlink iFemtocell & iFemtocell Evolution  |
| Wirnet iFemtoCell evolution  | Kerlink iFemtocell & iFemtocell Evolution  |
| Wirnet iBts  | Kerlink iBTS Compact FPGA v61  |
| Wirnet iBts 1 LOC  | Kerlink iBTS Compact FPGA v61 |
| wirnet.iBts TYPE_LORA_LOC  | Kerlink iBTS Compact FPGA v61  |

### ChirpStack
1.  Edit `.env.chirpstack` file
  - `URL`: LORIOT NMS URL (example: `eu1.loriot.io`)
  - `AUTH`: LORIOT API authorization header (example: `Bearer AAAAAgvm9WBrwSdUFQ7_SB1ItnTnxbJDfXE6RjbUBNdeVmfG8`)
  - `CHIRPSTACK_URL`: ChirpStack URL (example: `localhost:8080`)
  - `CHIRPSTACK_API_TOKEN`: ChirpStack API Token (example: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6IjFjNjYyNzUwLTYyYzQtNDVkMi1hZDBhLTRkOWM4MGRjM2I3YyIsInR5cCI6ImtleSJ9.397sJNNvVUaIVR2r_-bgFXe3reR7NQB-N6lNTtkSYhQ`)
  - `CHIRPSTACK_TENANT_ID`: ChirpStack Tenant ID (example: `52f14cd4-c6f1-4fbd-8f87-4025e1d49242`)
  - `CLEAN`: Set to `1` to delete existing resources on LORIOT if to import. Useful for cleaning previous import intents.
  - `IMPORT`: Set to `0` to disable the import. Useful for evaluating only ChirpStack resources.
2. `docker compose -f docker-compose.chirpstack.yaml build && docker compose -f docker-compose.chirpstack.yaml up`

#### NOTE
- It's not possible to retrieve gateway MAC address and model from ChirpStack. So gateways are imported as Basics Station with a random MAC address. The eth0 MAC address is used as unique identifier by LORIOT, so please be careful that it could generate conflicts. (possible improvement: provide eth0 addresses from an external file).
- The tool migrates only basic http output configuration, more integrations are coming soon.
- LORIOT and ChirpStack output messages are different, remember to update your Application Server according to [LORIOT Output Data Format](https://docs.loriot.io/space/NMS/6034128/Output+Data+Format)