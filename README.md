# LORIOT Migration Tool

W.I.P. tool to migrate resources to LORIOT NMS

## Requirements

- `docker-compose` installed on your machine
- [LORIOT API key](https://docs.loriot.io/display/NMS/Create+an+API+key)

## Build

`docker-compose build`

## Usage

### Kerlink WMC

1. Export csv files from Kerlink WMC to the following paths:

- For devices migration:
  - `./data/clusters.csv`
  - `./data/pushConfigurations.csv`
  - `./data/devices.csv` (extended with `dev_addr`, `AppSKey` and `NwkSKey` columns)
- For gateways migration:
  - `./data/fleets.csv`
  - (SKIP IF MIGRATE VIA KERLINK ZTP) `./data/gateways.csv` (extended with `eth0MAC` column)

2. Edit `.env` file
   - `URL`: LORIOT NMS url (example: `eu1.loriot.io`)
   - `AUTH`: LORIOT API authorization header (example: `Bearer AAAAAgvm9WBrwSdUFQ7_SB1ItnTnxbJDfXE6RjbUBNdeVmfG8`)
3. `docker-compose up`

### Chirpstack

1.  Edit `.env` file

- `URL`: LORIOT NMS url (example: `eu1.loriot.io`)
- `AUTH`: LORIOT API authorization header (example: `Bearer AAAAAgvm9WBrwSdUFQ7_SB1ItnTnxbJDfXE6RjbUBNdeVmfG8`)
- `CHIRPSTACK_URL`: CHIRSPSTACK url (example: `localhost:8080`)
- `CHIRPSTACK_API_TOKEN`: CHIRPSTACK API Token (example: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6IjFjNjYyNzUwLTYyYzQtNDVkMi1hZDBhLTRkOWM4MGRjM2I3YyIsInR5cCI6ImtleSJ9.397sJNNvVUaIVR2r_-bgFXe3reR7NQB-N6lNTtkSYhQ`)
- `CHIRPSTACK_TENANT_ID`: Chirpstack Tenant ID (example: `52f14cd4-c6f1-4fbd-8f87-4025e1d49242`)

2. `docker-compose up`

## Notes

- If a LORIOT application/network already exists with the same name, it will be reused
- If the device/gateway already exists, it will be deleted and created again (to update its parameters)
