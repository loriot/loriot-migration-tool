# Kerlink Migration Tool

W.I.P. tool to migrate resources from Kerlink Wanesy Management Center to LORIOT NMS

## Requirements

- `docker-compose` installed on your machine
- [LORIOT API key](https://docs.loriot.io/display/NMS/Create+an+API+key)
- Kerlink WMC export files (denpending on what you want to migrate):
  - For devices migration:
    - Clusters CSV file
    - Push Configurations CSV file
    - End-devices CSV file (extended with dev_addr, AppSKey and NwkSKey columns)
  - For gateways migration:
    - Fleets CSV file
    - (SKIP IF MIGRATE VIA KERLINK ZTP) Gateways CSV file (extended with eth0MAC column)

## Build

`docker-compose build`

## Usage

1. Export csv files from Kerlink WMC to the following paths:

- For devices migration:
  - `./data/clusters.csv`
  - `./data/pushConfigurations.csv`
  - `./data/devices.csv`
- For gateways migration:
  - `./data/fleets.csv`
  - (SKIP IF MIGRATE VIA KERLINK ZTP) `./data/gateways.csv`

2. Edit `.env` file
   - `URL`: LORIOT NMS url (example: `eu1.loriot.io`)
   - `AUTH`: LORIOT API authorization header (example: `Bearer AAAAAgvm9WBrwSdUFQ7_SB1ItnTnxbJDfXE6RjbUBNdeVmfG8`)
3. `docker-compose up`
