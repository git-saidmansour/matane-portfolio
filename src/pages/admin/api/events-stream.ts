import type { APIRoute } from 'astro';
import { liveEvents } from '../../../lib/events';

export const GET: APIRoute = () => {
  let cleanup: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const listener = (event: unknown) => send(event);
      liveEvents.on('event', listener);
      controller.enqueue(encoder.encode(': connected\n\n'));

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 25000);

      cleanup = () => {
        clearInterval(keepAlive);
        liveEvents.off('event', listener);
      };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx buffers proxied responses by default, which would delay/batch
      // SSE messages instead of streaming them live. This header disables
      // buffering for this response specifically.
      'X-Accel-Buffering': 'no',
    },
  });
};
