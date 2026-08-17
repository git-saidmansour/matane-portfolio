import type { APIRoute } from 'astro';
import { deleteProject } from '../../../../lib/db';

export const POST: APIRoute = ({ params, redirect }) => {
  const id = Number(params.id);
  if (Number.isInteger(id)) deleteProject(id);
  return redirect('/admin/projects');
};
