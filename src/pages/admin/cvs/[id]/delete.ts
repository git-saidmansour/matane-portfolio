import type { APIRoute } from 'astro';
import { getCv, deleteCv } from '../../../../lib/db';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';

export const POST: APIRoute = async ({ params, redirect }) => {
  const id = Number(params.id);
  if (Number.isInteger(id)) {
    const cv = getCv(id);
    if (cv && cv.file_path.startsWith('/uploads/')) {
      const filePath = path.join(DATA_DIR, cv.file_path.replace(/^\/uploads\//, 'uploads/'));
      await unlink(filePath).catch(() => {});
    }
    deleteCv(id);
  }
  return redirect('/admin/cvs');
};
