#!/usr/bin/env ts-node

import { PackageFile } from '../lib/package';
import { env } from '../lib/util';

const main = () => {
  const versionFromPackage = env('versionFromPackage');
  const versionPrefix = env('versionPrefix', '');
  const versionSuffix = env('versionSuffix', '');
  const semver = env('semver', 'minor') as 'major' | 'minor' | 'patch';
  const directory = env('PWD', '.');

  const packageJson = PackageFile.fromFile(directory);

  let version: string | undefined;
  if (versionFromPackage) {
    version = packageJson.dependencyVersion(versionFromPackage);
    if (!version) {
      throw new Error(`Missing dependency version ${versionFromPackage}`);
    }
  } else {
    version = packageJson.increase(semver);
  }
  version = versionPrefix + version + versionSuffix;

  packageJson.content['version'] = version;
  packageJson.write();
  console.log(version);
};

if (require.main === module) {
  main();
}
