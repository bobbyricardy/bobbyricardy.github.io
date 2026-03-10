// ─── rum-api.js ───────────────────────────────────────────────────────────────
// API client and data transformer for the RUM 3D waterfall visualization.
//
// BACKEND CONTRACT
//   Two endpoints, same response shape (see @typedef RumApiResponse below).
//   All time values must be in milliseconds (convert from Elasticsearch's
//   native microseconds in the backend before responding).
//
//   GET /api/rum/trace?id=<transactionId>
//     Fetch a specific page-load transaction by its APM transaction ID
//     (transaction.id — 16-char hex, NOT the 32-char traceId).
//     Elasticsearch query: apm-*-transaction-*, filter transaction.id: <id>, limit 1.
//     Matching spans:      apm-*-span-*,        filter transaction.id: <id>, fetch all.
//
//   GET /api/rum/latest-trace
//     Fetch the most recent page-load transaction (fallback when no id is known).
//     Elasticsearch query: apm-*-transaction-*, filter transaction.type: page-load,
//                          sort @timestamp desc, limit 1.
//
// CORS
//   The endpoint must include:
//     Access-Control-Allow-Origin: https://bobbyricardy.github.io
//   Option A: configure directly on the GCP VM (nginx / Express header).
//   Option B: proxy via a Cloudflare Worker (mirrors apm.bobbyricardy.dev).
//
// ELASTICSEARCH FIELD MAPPINGS (for the backend implementer)
//   Transaction: index apm-*-transaction-*, filter transaction.type: page-load,
//                sort @timestamp desc, limit 1
//   Navigation:  transaction.marks.navigationTiming.*
//   Spans:       index apm-*-span-*, filter transaction.id: <tx.id>
//   Client IP:   client.ip   |   User-Agent: user_agent.original
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 5000;

// ─── API contract typedefs ────────────────────────────────────────────────────

/**
 * @typedef {Object} RumApiMeta
 * Metadata about the captured trace session.
 * @property {string} traceId      - transaction.trace.id from Elasticsearch
 * @property {string} service      - APM service name (e.g. "rotom-dex-portfolio")
 * @property {string} agentVersion - RUM agent version (e.g. "4.8.1")
 * @property {string} timestamp    - ISO-8601 capture time (@timestamp, converted from us)
 * @property {string} [clientIp]   - client.ip from the transaction document
 * @property {string} [userAgent]  - user_agent.original from the transaction document
 */

/**
 * @typedef {Object} NavigationMarks
 * Navigation timing offsets, all in **milliseconds** from navigation start.
 * Source: transaction.marks.navigationTiming.* (Elasticsearch stores ms for RUM).
 * @property {number} domainLookupStart
 * @property {number} domainLookupEnd
 * @property {number} connectStart
 * @property {number} connectEnd
 * @property {number} requestStart
 * @property {number} responseEnd
 * @property {number} domInteractive
 * @property {number} domComplete
 * @property {number} [loadEventEnd]
 */

/**
 * @typedef {Object} RumApiSpan
 * A single resource-timing span from the Elastic APM RUM agent.
 * Source: apm-*-span-* index, filtered by transaction.id.
 * @property {string} id       - span.id
 * @property {string} name     - span.name (usually the resource URL path or filename)
 * @property {string} type     - span.type (e.g. "resource")
 * @property {string} subtype  - span.subtype: "script" | "css" | "font" | "xmlhttprequest"
 * @property {number} start    - span.start.us / 1000 → ms offset from transaction start
 * @property {number} duration - span.duration.us / 1000 → ms
 * @property {{ service: { resource: string } }} [destination]
 *   span.destination — e.g. { service: { resource: "unpkg.com:443" } }
 * @property {{ response: { transferSize: number, decodedBodySize: number } }} [http]
 *   context.http.response.transfer_size and decoded_body_size (bytes)
 */

/**
 * @typedef {Object} RumApiResponse
 * Full response shape expected from GET /api/rum/latest-trace.
 *
 * @example
 * {
 *   "meta": {
 *     "traceId":      "6c9fd138abcd1234efgh5678",
 *     "service":      "rotom-dex-portfolio",
 *     "agentVersion": "4.8.1",
 *     "timestamp":    "2026-03-05T09:30:00.000Z",
 *     "clientIp":     "49.245.121.88",
 *     "userAgent":    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ..."
 *   },
 *   "transaction": {
 *     "id": "abc123def456",
 *     "duration": 850,
 *     "marks": {
 *       "navigationTiming": {
 *         "domainLookupStart": 3,
 *         "domainLookupEnd":   35,
 *         "connectStart":      35,
 *         "connectEnd":        46,
 *         "requestStart":      56,
 *         "responseEnd":       303,
 *         "domInteractive":    308,
 *         "domComplete":       584
 *       }
 *     }
 *   },
 *   "spans": [
 *     {
 *       "id":       "d67cabaa1234",
 *       "name":     "elastic-apm-rum.umd.min.js",
 *       "type":     "resource",
 *       "subtype":  "script",
 *       "start":    310,
 *       "duration": 9.7,
 *       "destination": { "service": { "resource": "unpkg.com:443" } },
 *       "http": { "response": { "transferSize": 0, "decodedBodySize": 0 } }
 *     },
 *     {
 *       "id":       "f5aee95c5678",
 *       "name":     "jquery.min.js",
 *       "type":     "resource",
 *       "subtype":  "script",
 *       "start":    312,
 *       "duration": 10.3,
 *       "destination": { "service": { "resource": "ajax.googleapis.com:443" } },
 *       "http": { "response": { "transferSize": 0, "decodedBodySize": 86717 } }
 *     }
 *   ]
 * }
 *
 * @property {RumApiMeta} meta
 * @property {{ id: string, duration: number, marks: { navigationTiming: NavigationMarks } }} transaction
 * @property {RumApiSpan[]} spans
 */

/**
 * @typedef {Object} GraphNode
 * A node in the waterfall graph, consumed by rum.js render functions.
 * @property {string}      id
 * @property {string}      label
 * @property {string}      sub
 * @property {string}      type
 * @property {number|null} dur
 * @property {number|null} start
 * @property {number}      gc    - CSS grid column (1-7)
 * @property {number}      gr    - CSS grid row (1-4)
 * @property {boolean}     [nav]
 * @property {{ type: string, id: string, dest?: string, size?: string, note?: string }} tip
 */

/**
 * @typedef {Object} GraphEdge
 * A directed edge between two graph nodes.
 * @property {string} f   - from node id
 * @property {string} t   - to node id
 * @property {number} dur - duration in ms (drives particle speed and count)
 */

// ─── Exported API functions ───────────────────────────────────────────────────

/**
 * Fetches the latest RUM trace from the GCP VM API.
 * Uses AbortController to enforce a 5-second timeout.
 * Returns null on any network error, HTTP error, timeout, or JSON parse failure —
 * callers can always safely fall back to demo data.
 *
 * @param {string} apiUrl - Full URL of the GCP VM endpoint
 * @returns {Promise<RumApiResponse|null>}
 */
export async function fetchRumData(apiUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Converts a RumApiResponse into the {nodes, edges} graph format used by rum.js.
 * Returns null if required fields (navigationTiming, spans array) are missing,
 * so callers can fall back to demo data without crashing.
 *
 * Grid layout convention (must match rum.css):
 *   Navigation chain → row 2, cols 1–5  (browser → dns → tcp → doc → parse)
 *   Resource fan-out → col 6, rows 1–4  (grouped by CDN host)
 *   Font             → col 7, row 4     (triggered by font-face in CSS)
 *
 * @param {RumApiResponse} data
 * @returns {{ nodes: GraphNode[], edges: GraphEdge[] }|null}
 */
export function transformToGraph(data) {
  if (!data?.transaction?.marks?.navigationTiming || !Array.isArray(data?.spans)) {
    return null;
  }

  const { navigationTiming } = data.transaction.marks;
  const { spans, meta } = data;

  // Validate that all required navigation marks are present and numeric
  const requiredMarks = ['domainLookupStart', 'domainLookupEnd', 'connectStart', 'connectEnd', 'requestStart', 'responseEnd', 'domInteractive', 'domComplete'];
  if (requiredMarks.some(k => typeof navigationTiming[k] !== 'number')) return null;

  const dnsDur = navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart;
  const tcpDur = navigationTiming.connectEnd - navigationTiming.connectStart;
  const docDur = navigationTiming.responseEnd - navigationTiming.requestStart;
  const parseDur = navigationTiming.domComplete - navigationTiming.domInteractive;

  const agentLabel = meta?.agentVersion ? `js-base ${meta.agentVersion}` : 'js-base';
  const browserSub = meta?.userAgent
    ? `${detectBrowserLabel(meta.userAgent)} · ${agentLabel}`
    : agentLabel;

  /** @type {GraphNode[]} */
  const navNodes = [
    {
      id: 'browser', label: 'Browser', sub: browserSub, type: 'browser',
      dur: null, start: null, gc: 1, gr: 2, nav: true,
      tip: { type: '—', id: '', dest: meta?.clientIp ?? 'unknown', note: 'Browser type inferred from User-Agent' }
    },
    {
      id: 'dns', label: 'DNS Lookup', sub: 'Domain resolution', type: 'dns',
      dur: dnsDur, start: navigationTiming.domainLookupStart, gc: 2, gr: 2, nav: true,
      tip: { type: 'hard-navigation / browser-timing', id: '', dest: 'bobbyricardy.github.io' }
    },
    {
      id: 'tcp', label: 'TCP Connect', sub: 'Server connection', type: 'tcp',
      dur: tcpDur, start: navigationTiming.connectStart, gc: 3, gr: 2, nav: true,
      tip: { type: 'hard-navigation / browser-timing', id: '', dest: 'bobbyricardy.github.io:443' }
    },
    {
      id: 'doc', label: 'Document', sub: 'Request + receive', type: 'doc',
      dur: docDur, start: navigationTiming.requestStart, gc: 4, gr: 2, nav: true,
      tip: { type: 'hard-navigation / browser-timing', id: '', dest: 'bobbyricardy.github.io:443' }
    },
    {
      id: 'parse', label: 'DOM Parse', sub: 'Exec sync scripts', type: 'parse',
      dur: parseDur, start: navigationTiming.domInteractive, gc: 5, gr: 2, nav: true,
      tip: { type: 'hard-navigation / browser-timing', id: '' }
    },
  ];

  const resourceNodes = buildResourceNodes(spans);
  const fontNode = buildFontNode(spans);

  const nodes = [...navNodes, ...resourceNodes, ...(fontNode ? [fontNode] : [])];

  /** @type {GraphEdge[]} */
  const navEdges = [
    { f: 'browser', t: 'dns',   dur: dnsDur },
    { f: 'dns',     t: 'tcp',   dur: tcpDur },
    { f: 'tcp',     t: 'doc',   dur: docDur },
    { f: 'doc',     t: 'parse', dur: parseDur },
  ];

  const resourceEdges = resourceNodes.map(n => ({ f: 'parse', t: n.id, dur: n.dur ?? 1 }));
  const fontEdge = fontNode
    ? [{ f: resourceNodes.at(-1)?.id ?? 'parse', t: 'font', dur: fontNode.dur ?? 1 }]
    : [];

  return { nodes, edges: [...navEdges, ...resourceEdges, ...fontEdge] };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Maps a User-Agent string to a coarse browser display label.
 *
 * @param {string} ua
 * @returns {string}
 */
function detectBrowserLabel(ua) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/OPR\/|Opera\//.test(ua)) return 'Opera';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Chrome\//.test(ua)) return 'Chrome';
  return 'Browser';
}

/**
 * Groups resource spans by CDN host and maps them to fan-out grid nodes.
 * Spans from unrecognised hosts are silently skipped.
 * Grid position: gc=6, gr=1..4.
 *
 * @param {RumApiSpan[]} spans
 * @returns {GraphNode[]}
 */
function buildResourceNodes(spans) {
  // host prefix → static node config
  const HOST_MAP = {
    'unpkg.com':              { id: 'unpkg', label: 'unpkg.com',   sub: 'elastic-apm-rum',     type: 'fast', gr: 1 },
    'ajax.googleapis.com':    { id: 'goog',  label: 'Google APIs', sub: 'jquery-3.1.1.min.js', type: 'fast', gr: 2 },
    'cdnjs.cloudflare.com':   { id: 'cf',    label: 'cdnjs · CF',  sub: 'tether-1.4.0.min.js', type: 'fast', gr: 3 },
    'bobbyricardy.github.io': { id: 'gh',    label: 'github.io',   sub: null,                  type: 'slow', gr: 4 },
  };

  /** @type {Record<string, { config: typeof HOST_MAP[string], spanList: RumApiSpan[] }>} */
  const buckets = {};

  for (const span of spans) {
    if (span.subtype === 'font') continue;
    const resource = span.destination?.service?.resource ?? '';
    const host = resource.split(':')[0];
    const config = HOST_MAP[host];
    if (!config) continue;
    if (!buckets[config.id]) buckets[config.id] = { config, spanList: [] };
    buckets[config.id].spanList.push(span);
  }

  return Object.values(buckets)
    .sort((a, b) => a.config.gr - b.config.gr)
    .map(({ config, spanList }) => {
      const isGh = config.id === 'gh';
      const maxDur = Math.max(...spanList.map(s => s.duration));
      const avgDur = spanList.reduce((sum, s) => sum + s.duration, 0) / spanList.length;
      const minStart = Math.min(...spanList.map(s => s.start));
      const totalDecoded = spanList.reduce((sum, s) => sum + (s.http?.response?.decodedBodySize ?? 0), 0);

      return {
        id: config.id,
        label: config.label,
        sub: isGh
          ? `${spanList.length} resources · avg ${Math.round(avgDur)} ms`
          : (config.sub ?? spanList[0]?.name ?? ''),
        type: config.type,
        dur: isGh ? Math.round(avgDur) : maxDur,
        start: minStart,
        gc: 6,
        gr: config.gr,
        tip: {
          type: `resource / ${[...new Set(spanList.map(s => s.subtype))].join(' + ')}`,
          id: spanList.length === 1 ? spanList[0].id : 'multiple',
          dest: spanList[0]?.destination?.service?.resource ?? '',
          size: isGh
            ? `~${Math.round(totalDecoded / 1024)} KB decoded`
            : formatTransferSize(spanList[0]),
          note: isGh ? spanList.map(s => s.name).join(', ') : undefined,
        },
      };
    });
}

/**
 * Finds font spans and creates a single font node at gc=7, gr=4.
 * Returns null if no font spans are present.
 *
 * @param {RumApiSpan[]} spans
 * @returns {GraphNode|null}
 */
function buildFontNode(spans) {
  const fontSpans = spans.filter(s => s.subtype === 'font');
  if (!fontSpans.length) return null;

  const span = fontSpans[0];
  const sizeKb = span.http?.response?.decodedBodySize
    ? Math.round(span.http.response.decodedBodySize / 1024)
    : null;

  return {
    id: 'font',
    label: 'FontAwesome',
    sub: `webfont.woff2${sizeKb ? ` (${sizeKb} KB)` : ''}`,
    type: 'font',
    dur: span.duration,
    start: span.start,
    gc: 7,
    gr: 4,
    tip: {
      type: 'resource / css (font)',
      id: span.id,
      dest: span.destination?.service?.resource ?? '',
      size: sizeKb ? `${sizeKb} KB` : 'unknown',
      note: 'Triggered by font-awesome.min.css',
    },
  };
}

/**
 * Formats a span's HTTP transfer size into a human-readable string for tooltips.
 *
 * @param {RumApiSpan} span
 * @returns {string}
 */
function formatTransferSize(span) {
  const transfer = span?.http?.response?.transferSize ?? -1;
  const decoded = span?.http?.response?.decodedBodySize ?? 0;
  if (transfer === 0) return 'cached (0 B transfer)';
  if (decoded > 0) return `${(decoded / 1024).toFixed(1)} KB decoded`;
  return 'unknown';
}
