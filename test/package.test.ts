import { Package } from '../lib/package';

describe('Package', () => {
  const p = new Package({
    version: 'v0.1.2',
    dependencies: {
      foo: 'v0.1.2',
      '@foo/package1': 'v1.2.3',
      '@foo/package2': 'v2.3.4',
      '@bar/package1': 'v3.4.5',
      '@bar/package2': 'v4.5.6',
    },
    devDependencies: {
      '@zoing/package1': 'v4.6.7',
      '@zoing/package2': 'v6.7.8',
      zoing: 'v7.8.9',
    },
  });
  it('Merges all dependencies', () => {
    expect(p.dependencies).toEqual({
      foo: 'v0.1.2',
      '@foo/package1': 'v1.2.3',
      '@foo/package2': 'v2.3.4',
      '@bar/package1': 'v3.4.5',
      '@bar/package2': 'v4.5.6',
      '@zoing/package1': 'v4.6.7',
      '@zoing/package2': 'v6.7.8',
      zoing: 'v7.8.9',
    });
  });
  describe('dependencyVersion', () => {
    it('Finds dependency version', () => {
      expect(p.dependencyVersion('@foo/package1')).toEqual('v1.2.3');
      expect(p.dependencyVersion('@bar/package2')).toEqual('v4.5.6');
      expect(p.dependencyVersion('@bar/package3')).toBeUndefined();
      expect(p.dependencyVersion('bla')).toBeUndefined();
    });
    it('Strips version ranges', () => {
      const p = new Package({
        version: 'v0.1.2',
        dependencies: {
          '@foo/package1': '^1.2.3',
          '@foo/package2': '~2.3.4',
          '@foo/package3': '3.4.5',
        },
      });
      expect(p.dependencyVersion('@foo/package1')).toEqual('1.2.3');
      expect(p.dependencyVersion('@foo/package2')).toEqual('2.3.4');
      expect(p.dependencyVersion('@foo/package3')).toEqual('3.4.5');
    });
  });
  it('Increases SEMVER Version', () => {
    expect(p.increase('major')).toEqual('v1.1.2');
    expect(p.increase('minor')).toEqual('v0.2.2');
    expect(p.increase('patch')).toEqual('v0.1.3');
  });
  describe('pinnedDependencies', () => {
    it('Does not change already pinned versions', () => {
      expect(p.pinnedDependencies(['foo', '@foo'], 'dependencies')).toEqual(p.content['dependencies']);
      expect(p.pinnedDependencies(['foo', '@foo'], 'devDependencies')).toEqual(p.content['devDependencies']);
    });
    it('Changes already pinned versions', () => {
      const p = new Package({
        dependencies: {
          foo: '~0.1.2',
          '@foo/package1': '~1.2.3',
          '@foo/package2': '^2.3.4',
          '@bla/package1': '~3.4.5',
        },
        devDependencies: {
          '@bar/package1': '~4.5.6',
          '@bar/package2': '^5.6.7',
          '@bla/package2': '~6.7.8',
          bla: '~7.8.8',
        },
      });
      expect(p.pinnedDependencies(['foo', '@foo'], 'dependencies')).toEqual({
        foo: '0.1.2',
        '@foo/package1': '1.2.3',
        '@foo/package2': '2.3.4',
        '@bla/package1': '~3.4.5',
      });
      expect(p.pinnedDependencies(['bar', '@bar'], 'devDependencies')).toEqual({
        '@bar/package1': '4.5.6',
        '@bar/package2': '5.6.7',
        '@bla/package2': '~6.7.8',
        bla: '~7.8.8',
      });
    });
  });
  it('Does change peer dependencies', () => {
    p.content['peerDependencies'] = {
      '@foo/package1': 'v0.0.0',
      '@bar/package1': 'v1.1.1',
      '@zoing/package1': 'v2.2.2',
    };
    expect(p.updatedPeerDependencies()).toEqual({
      '@foo/package1': 'v1.2.3',
      '@bar/package1': 'v3.4.5',
      '@zoing/package1': 'v4.6.7',
    });
  });
});
