import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';
const UPLOADS_DIR = path.resolve(path.join(DATA_DIR, 'uploads'));

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

export const GET: APIRoute = async ({ params }) => {
  const requested = params.path ?? '';
  const resolved = path.resolve(path.join(UPLOADS_DIR, requested));

  // Prevent path traversal outside the uploads directory.
  if (!resolved.startsWith(UPLOADS_DIR)) {
    return new Response('Not found', { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const file = await readFile(resolved);
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
