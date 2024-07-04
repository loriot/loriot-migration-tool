# LORIOT Migration Tool

PoC tool to migrate resources to LORIOT NMS

## Requirements

- `docker` installed on your machine
- [LORIOT API Token](https://docs.loriot.io/display/NMS/Create+an+API+key)

### Kerlink WMC

- `.csv` files exported from Kerlink WMC
  - For devices migration:
    - `./data/clusters.csv` (optional: if not provied, clusters are taken from `devices.csv`)
    - `./data/pushConfigurations.csv` (optional)
    - `./data/devices.csv` (extended with `dev_addr`, `AppSKey` and `NwkSKey` columns)
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
3. `docker compose -f docker-compose.kerlink.yaml build && docker compose -f docker-compose.kerlink.yaml up`

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
