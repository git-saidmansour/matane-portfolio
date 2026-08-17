const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|curl|wget|python-requests|go-http-client|zgrab|headless|preview|monitor|uptime|pingdom|ahrefs|semrush|mj12/i;

export function isBotRequest(request: Request): boolean {
  const ua = request.headers.get('user-agent') || '';
  return BOT_UA_PATTERN.test(ua);
}
