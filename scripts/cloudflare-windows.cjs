// OpenNext traces pnpm directory links. Windows junctions work without
// administrator or Developer Mode privileges; ordinary symlinks may not.
const fs = require('node:fs');
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');
const original = fs.symlinkSync;
const output = path.resolve('.open-next') + path.sep;
fs.symlinkSync = function (target, destination, type) {
  try {
    return original(target, destination, type);
  } catch (error) {
    if (error.code !== 'EPERM' || !path.resolve(destination).startsWith(output))
      throw error;
    const source = path.resolve(path.dirname(destination), target);
    if (fs.statSync(source).isDirectory())
      return original(source, destination, 'junction');
    return fs.copyFileSync(source, destination);
  }
};
syncBuiltinESMExports();
