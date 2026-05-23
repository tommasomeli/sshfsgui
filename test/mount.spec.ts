import * as os from 'os';
import { describe, expect, it } from 'vitest';
import { buildSshfsArgs } from '@shared/sshfs-args';
import { collapseHome, expandHome } from '@shared/paths';
import { sampleServer } from './helpers/sample-server';

const HOME = os.homedir();

describe('expandHome', () => {
  it('expands ~/ prefix to the user home directory', () => {
    expect(expandHome('~/mnt/prod')).toBe(`${HOME}/mnt/prod`);
  });

  it('returns ~ alone as the home directory', () => {
    expect(expandHome('~')).toBe(HOME);
  });

  it('leaves absolute paths unchanged', () => {
    expect(expandHome('/tmp/mount')).toBe('/tmp/mount');
  });
});

describe('collapseHome', () => {
  it('collapses paths under home to ~/ form', () => {
    expect(collapseHome(`${HOME}/mnt/prod`)).toBe('~/mnt/prod');
  });

  it('returns ~ when the path is exactly home', () => {
    expect(collapseHome(HOME)).toBe('~');
  });

  it('expands ~ before collapsing', () => {
    expect(collapseHome('~/mnt/prod')).toBe('~/mnt/prod');
  });
});

describe('buildSshfsArgs', () => {
  it('builds default sshfs arguments', () => {
    const config = sampleServer();
    expect(buildSshfsArgs(config, false)).toEqual([
      'deploy@example.com:/var/www',
      '~/mnt/test',
      '-p', '22',
      '-o', 'reconnect',
      '-o', 'auto_cache',
      '-o', 'noappledouble',
      '-o', 'volname=Test Server',
    ]);
  });

  it('adds IdentityFile for key auth', () => {
    const config = sampleServer({
      authMethod: 'key',
      identityFile: '~/.ssh/id_ed25519',
    });
    expect(buildSshfsArgs(config, false)).toContain('-o');
    expect(buildSshfsArgs(config, false)).toContain('IdentityFile=~/.ssh/id_ed25519');
  });

  it('adds password_stdin when password auth has a stored password', () => {
    const config = sampleServer({ authMethod: 'password' });
    expect(buildSshfsArgs(config, true)).toContain('password_stdin');
    expect(buildSshfsArgs(config, false)).not.toContain('password_stdin');
  });

  it('appends extra sshfs options', () => {
    const config = sampleServer({ extraOptions: 'nonamedattr follow_symlinks' });
    const args = buildSshfsArgs(config, false);
    expect(args).toContain('nonamedattr');
    expect(args).toContain('follow_symlinks');
  });
});
