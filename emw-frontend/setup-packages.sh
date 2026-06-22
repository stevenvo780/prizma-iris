#!/bin/bash
# Setup monorepo packages for Vercel deployment
# Since Vercel only uploads the subdirectory, we need to manually handle the packages

set -e

echo "Setting up Prizma monorepo packages..."

# If packages exist from uploaded files, create links
if [ -d "../../packages" ]; then
  echo "Packages directory found, linking..."
  mkdir -p node_modules

  for pkg in brand tokens ui tailwind-preset; do
    if [ -d "../../packages/$pkg" ]; then
      if [ ! -d "node_modules/prizma-$pkg" ]; then
        ln -s ../../../packages/$pkg node_modules/prizma-$pkg || cp -r ../../packages/$pkg node_modules/prizma-$pkg
        echo "✓ Set up prizma-$pkg"
      fi
    fi
  done
else
  echo "Warning: packages directory not found"
fi

echo "Package setup complete"
