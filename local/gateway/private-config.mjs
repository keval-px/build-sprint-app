import {constants, openSync, fstatSync, lstatSync, readFileSync, closeSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {identity} from './dev-identity.mjs';

export const privateDirectory = fileURLToPath(new URL('../../.local/convex/private/', import.meta.url));
export const privateConfigPath = join(privateDirectory,'shopify-dev.json');

// The runtime uses only this fixed destination, never ambient environment keys.
// The directory argument allows isolated temporary-file tests, not CLI overrides.
export function loadPrivateConfiguration(directory = privateDirectory) {
  let fd;
  try {
    const parent = lstatSync(directory);
    if (!parent.isDirectory() || (parent.mode & 0o777) !== 0o700 || parent.uid !== process.getuid()) throw Error();
    fd = openSync(join(directory,'shopify-dev.json'),constants.O_RDONLY | constants.O_NOFOLLOW);
    const file = fstatSync(fd);
    if (!file.isFile() || (file.mode & 0o777) !== 0o600 || file.uid !== process.getuid() || file.nlink !== 1 || file.size > 4096) throw Error();
    const text = readFileSync(fd,'utf8');
    if (Buffer.byteLength(text) > 4096) throw Error();
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'clientId,clientSecret' ||
        data.clientId !== identity.clientId || typeof data.clientSecret !== 'string' ||
        data.clientSecret.length < 16 || data.clientSecret.length > 256 || /\s/.test(data.clientSecret)) throw Error();
    return data;
  } catch { throw Error('Private configuration is missing or invalid; verify the approved handoff and owner-only permissions.'); }
  finally { if (fd !== undefined) closeSync(fd); }
}
