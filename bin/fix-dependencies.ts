#!/usr/bin/env ts-node

import { PackageFile } from '../lib/package';
import { env } from '../lib/util';

const main = () => {
  const scopes = env('scopes').split(/\s+/);
  const enforcePinning = JSON.parse(env('enforcePinning', 'false')) ? true : false;
  const updatePeerDependencies = JSON.parse(env('updatePeerDependencies', 'false')) ? true : false;
  const directory = env('PWD', '.');

  const packageJson = PackageFile.fromFile(directory);

  // strip all leading version range notations from package version
  if (enforcePinning) {
    if ('dependencies' in packageJson.content)
      packageJson.content['dependencies'] = packageJson.pinnedDependencies(scopes, 'dependencies');
    if ('devDependencies' in packageJson.content)
      packageJson.content['devDependencies'] = packageJson.pinnedDependencies(scopes, 'devDependencies');
  }

  // sync all peer dependency versions
  if (updatePeerDependencies) {
    if ('peerDependencies' in packageJson.content)
      packageJson.content['peerDependencies'] = packageJson.updatedPeerDependencies();
  }

  packageJson.write();
};

if (require.main === module) {
  main();
}
