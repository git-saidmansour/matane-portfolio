import { EventEmitter } from 'node:events';

export const liveEvents = new EventEmitter();
liveEvents.setMaxListeners(50);

export type LiveEvent = { type: 'page_view' | 'cv_download'; meta?: string };
