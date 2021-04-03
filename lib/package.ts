import * as fs from 'fs';
import * as path from 'path';

const versionNumber = (version: string): { num: number; prefix: string; suffix: string } => {
  let stripped = version.replace(/^[^0-9]+/, ''); // v1-alpha1 -> 1-alpha1
  const prefix = version.substr(0, version.length - stripped.length); // v1-alpha1 -> v
  version = stripped.replace(/[^0-9].+$/, ''); // 1-alpha1 -> 1
  const suffix = stripped.substr(version.length); // 1-alpha1 -> -alpha1
  return { num: parseInt(version, 10), prefix, suffix };
};

export class Package {
  constructor(public readonly content: Record<string, any>) {}

  public dependencyVersion = (name: string): string | undefined =>
    name in this.dependencies ? (this.dependencies[name] as string).replace(/^[\^~]+/, '') : undefined;

  public get dependencies(): Record<string, string> {
    return {
      ...((this.content['dependencies'] ?? {}) as Record<string, string>),
      ...((this.content['devDependencies'] ?? {}) as Record<string, string>),
    };
  }

  public increase(semver: 'major' | 'minor' | 'patch') {
    const parts: string[] = (this.content['version'] as string).split('.');
    const index = { major: 0, minor: 1, patch: 2 }[semver];
    const parsed = versionNumber(parts[index]!);
    parts[index] = `${parsed.prefix}${parsed.num + 1}${parsed.suffix}`;
    return parts.join('.');
  }

  public pinnedDependencies(scopes: string[], name?: string): Record<string, string> {
    if (!name) name = 'dependencies';
    if (!(name in this.content)) return {};
    return Object.fromEntries(
      Object.entries(this.content[name] as Record<string, string>).map(([key, value]) => {
        if (scopes.filter((scope) => key === scope || key.startsWith(scope + '/')).length == 0) return [key, value];
        return [key, value.replace(/^[\^~]+/, '')];
      })
    );
  }

  public updatedPeerDependencies(): Record<string, string> {
    if (!('peerDependencies' in this.content)) return {};
    const dependencies = this.dependencies;
    return Object.fromEntries(
      Object.entries(this.content['peerDependencies'] as Record<string, string>).map(([key, value]) => {
        if (key in dependencies) return [key, dependencies[key]!];
        return [key, value];
      })
    );
  }
}

export class PackageFile extends Package {
  constructor(public readonly path: string, public readonly content: Record<string, any>) {
    super(content);
  }

  public static fromFile(directory: string, file?: string): PackageFile {
    const abs = path.join(directory, file ?? 'package.json');
    const content = fs.readFileSync(abs);
    return new PackageFile(abs, JSON.parse(content.toString()) as Record<string, any>);
  }

  public write() {
    fs.writeFileSync(this.path, JSON.stringify(this.content, undefined, 2));
  }
}
