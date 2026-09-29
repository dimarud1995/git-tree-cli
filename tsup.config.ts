import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension() {
    return {
      js: '.js',
      dts: '.d.ts',
    };
  },
  banner: ({ entry }) => {
    if (entry === 'cli' || entry === 'src/cli.ts') {
      return { js: '#!/usr/bin/env node' };
    }
    return {};
  },
});
