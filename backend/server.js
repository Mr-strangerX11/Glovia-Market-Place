'use strict';

const path = require('path');

const distMainPath = path.join(__dirname, 'dist', 'src', 'main.js');

try {
  require(distMainPath);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Failed to start server. Did you run `npm run build`?', error);
  process.exit(1);
}
