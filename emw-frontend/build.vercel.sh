#!/bin/bash
set -e

# This script is used by Vercel to build the emw-frontend app.
# Vercel only uploads the subdirectory, so we need to handle monorepo packages locally.

echo "Building emw-frontend for Vercel..."
npm run build
