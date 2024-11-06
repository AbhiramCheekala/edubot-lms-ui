#!/bin/bash

# Install dependencies
npm i

# Build the project
npm run build

# Deploy to Azure Static Web Apps
swa deploy ./dist/ --deployment-token "" --env production --swa-config-location ./