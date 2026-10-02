import { spawn } from 'node:child_process';

/** The command that opens a file with the default app on this OS. */
export function openerFor(platform: NodeJS.Platform): { command: string; args: string[] } {
  if (platform === 'darwin') return { command: 'open', args: [] };
  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '""'] };
  return { command: 'xdg-open', args: [] };
}

/**
 * Opens a file in the default browser without waiting for it. Resolves false
 * when no opener exists (for example a headless server), so the caller can
 * print the path instead.
 */
export function openInBrowser(
  path: string,
  platform: NodeJS.Platform = process.platform,
): Promise<boolean> {
  const opener = openerFor(platform);
  return new Promise((resolve) => {
    const child = spawn(opener.command, [...opener.args, path], {
      detached: true,
      stdio: 'ignore',
    });
    child.once('error', () => resolve(false));
    child.once('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}
