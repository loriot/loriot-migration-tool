# Kerlink Migration Tool

W.I.P. tool to migrate resources from Wanesy Management Center to LORIOT NMS

## Build

`docker-compose build`

## Usage

1. Place exported csv file to `./data/devices.csv`
2. Edit `.env` file with destination LORIOT NMS (`URL`). E.g. `eu1.loriot.io`
3. Edit `.env` file with LORIOT API key authorization (`AUTH`). E.g. `Bearer AAAAAgvm9WBrwSdUFQ7_SB1ItnTnxbJDfXE6RjbUBNdeVmfG8` or `Session 7ba93f9a-b548-4f52-a553-7be480cbeb79`
4. `docker-compose up`
