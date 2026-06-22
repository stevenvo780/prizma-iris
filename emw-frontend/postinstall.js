#!/usr/bin/env node
/**
 * postinstall.js
 * Symlink file://path dependencies since Vercel doesn't support pnpm workspaces
 */
const fs = require('fs');
const path = require('path');

const deps = [
  'prizma-ui',
  'prizma-tokens', 
  'prizma-brand',
  'prizma-tailwind-preset'
];

const cwd = process.cwd();
const rootDeps = path.join(cwd, '../../packages');

deps.forEach(dep => {
  const srcPath = path.join(rootDeps, dep.replace('prizma-', ''));
  const destPath = path.join(cwd, 'node_modules', dep);
  
  if (fs.existsSync(srcPath)) {
    try {
      // Remove existing
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }
      // Create symlink
      fs.symlinkSync(srcPath, destPath, 'dir');
      console.log(`✓ Linked ${dep}`);
    } catch (e) {
      // If symlink fails, try copy (for Vercel)
      console.log(`Copying ${dep}...`);
      fs.cpSync(srcPath, destPath, { recursive: true, force: true });
    }
  }
});
