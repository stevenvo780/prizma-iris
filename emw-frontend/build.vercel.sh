#!/bin/bash
set -e

echo "Installing dependencies..."
npm install --legacy-peer-deps || npm install --legacy-peer-deps --force

echo "Linking workspace packages..."
mkdir -p node_modules/prizma-brand node_modules/prizma-tokens node_modules/prizma-ui node_modules/prizma-tailwind-preset

# Copy packages if not symlinked
if [ ! -L node_modules/prizma-brand ]; then
  cp -r ../../../packages/brand/* node_modules/prizma-brand/ 2>/dev/null || true
fi
if [ ! -L node_modules/prizma-tokens ]; then
  cp -r ../../../packages/tokens/* node_modules/prizma-tokens/ 2>/dev/null || true
fi
if [ ! -L node_modules/prizma-ui ]; then
  cp -r ../../../packages/ui/* node_modules/prizam-ui/ 2>/dev/null || true
fi
if [ ! -L node_modules/prizma-tailwind-preset ]; then
  cp -r ../../../packages/tailwind-preset/* node_modules/prizma-tailwind-preset/ 2>/dev/null || true
fi

echo "Building..."
npm run build
