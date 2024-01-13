# Kerlink Migration Tool

W.I.P. tool to migrate resources from Kerlink Wanesy Management Center to LORIOT NMS

## Requirements

- `docker-compose` installed on your machine
- [LORIOT API key](https://docs.loriot.io/display/NMS/Create+an+API+key)
- For devices migration:
  - Clusters CSV file
  - Push Configurations CSV file
  - End-devices CSV file
- For gateways migration:
  - TODO

## Build

`docker-compose build`

## Usage

1. Place exported csv files to:
   - `./data/clusters.csv`
   - `./data/pushConfigurations.csv`
   - `./data/devices.csv`
2. Edit `.env` file
   - `URL`: LORIOT NMS url (example: `eu1.loriot.io`)
   - `AUTH`: LORIOT API authorization header (example: `Bearer AAAAAgvm9WBrwSdUFQ7_SB1ItnTnxbJDfXE6RjbUBNdeVmfG8`)
3. `docker-compose up`
