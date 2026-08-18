import type { APIRoute } from 'astro';
import { ZipArchive } from 'archiver';
import { Readable } from 'node:stream';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import db from '../../lib/db';

const DATA_DIR = process.env.DATA_DIR || './data';

export const GET: APIRoute = async () => {
  const tmpDbPath = path.join(DATA_DIR, `backup-${Date.now()}.sqlite`);
  // VACUUM INTO gives a consistent standalone snapshot, safer than copying
  // the live .sqlite/-wal/-shm files directly while the DB is open.
  db.exec(`VACUUM INTO '${tmpDbPath.replace(/'/g, "''")}'`);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.file(tmpDbPath, { name: 'db.sqlite' });
  archive.directory(path.join(DATA_DIR, 'uploads'), 'uploads');
  archive.finalize();
  archive.on('end', () => {
    unlink(tmpDbPath).catch(() => {});
  });

  const filename = `matane-portfolio-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  return new Response(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
