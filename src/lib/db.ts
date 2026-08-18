import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { liveEvents } from './events';

const DATA_DIR = process.env.DATA_DIR || './data';
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(path.join(DATA_DIR, 'uploads', 'cv'))) {
  mkdirSync(path.join(DATA_DIR, 'uploads', 'cv'), { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'db.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    repo_url TEXT,
    live_url TEXT,
    featured INTEGER NOT NULL DEFAULT 0,
    order_num INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    bio_1 TEXT NOT NULL DEFAULT '',
    bio_2 TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    formation TEXT NOT NULL DEFAULT '',
    availability TEXT NOT NULL DEFAULT '',
    languages TEXT NOT NULL DEFAULT '',
    photo_path TEXT NOT NULL DEFAULT '/images/portrait.webp'
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    meta TEXT,
    country_code TEXT,
    country TEXT,
    city TEXT,
    lat REAL,
    lon REAL,
    referrer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cvs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Defensive migration for the `events` table created before geolocation
// columns existed (CREATE TABLE IF NOT EXISTS above won't add them to an
// already-existing table). Safe to run on every startup.
for (const columnDef of ['country_code TEXT', 'country TEXT', 'city TEXT', 'lat REAL', 'lon REAL', 'referrer TEXT']) {
  try {
    db.exec(`ALTER TABLE events ADD COLUMN ${columnDef}`);
  } catch {
    // column already exists
  }
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  repo_url: string | null;
  live_url: string | null;
  featured: boolean;
  order_num: number;
}

interface ProjectRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  tags: string;
  repo_url: string | null;
  live_url: string | null;
  featured: number;
  order_num: number;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tags),
    repo_url: row.repo_url,
    live_url: row.live_url,
    featured: !!row.featured,
    order_num: row.order_num,
  };
}

export function getProjects(): Project[] {
  const rows = db.prepare('SELECT * FROM projects ORDER BY order_num ASC, id ASC').all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: number): Project | undefined {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : undefined;
}

export interface ProjectInput {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  repo_url: string | null;
  live_url: string | null;
  featured: boolean;
  order_num: number;
}

export function createProject(data: ProjectInput): number {
  const result = db
    .prepare(
      `INSERT INTO projects (slug, title, description, tags, repo_url, live_url, featured, order_num)
       VALUES (@slug, @title, @description, @tags, @repo_url, @live_url, @featured, @order_num)`
    )
    .run({
      ...data,
      tags: JSON.stringify(data.tags),
      featured: data.featured ? 1 : 0,
    });
  return result.lastInsertRowid as number;
}

export function updateProject(id: number, data: ProjectInput): void {
  db.prepare(
    `UPDATE projects SET slug=@slug, title=@title, description=@description, tags=@tags,
     repo_url=@repo_url, live_url=@live_url, featured=@featured, order_num=@order_num,
     updated_at=datetime('now') WHERE id=@id`
  ).run({
    ...data,
    id,
    tags: JSON.stringify(data.tags),
    featured: data.featured ? 1 : 0,
  });
}

export function deleteProject(id: number): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

export interface Cv {
  id: number;
  slug: string;
  label: string;
  file_path: string;
}

export function getCvs(): Cv[] {
  return db.prepare('SELECT * FROM cvs ORDER BY id ASC').all() as Cv[];
}

export function getCv(id: number): Cv | undefined {
  return db.prepare('SELECT * FROM cvs WHERE id = ?').get(id) as Cv | undefined;
}

export function getCvBySlug(slug: string): Cv | undefined {
  return db.prepare('SELECT * FROM cvs WHERE slug = ?').get(slug) as Cv | undefined;
}

export function createCv(data: { slug: string; label: string; file_path: string }): number {
  const result = db
    .prepare('INSERT INTO cvs (slug, label, file_path) VALUES (@slug, @label, @file_path)')
    .run(data);
  return result.lastInsertRowid as number;
}

export function deleteCv(id: number): void {
  db.prepare('DELETE FROM cvs WHERE id = ?').run(id);
}

export interface Profile {
  bio_1: string;
  bio_2: string;
  location: string;
  formation: string;
  availability: string;
  languages: string;
  photo_path: string;
}

export function getProfile(): Profile {
  let row = db.prepare('SELECT * FROM profile WHERE id = 1').get() as Profile | undefined;
  if (!row) {
    db.prepare(
      `INSERT INTO profile (id, bio_1, bio_2, location, formation, availability, languages, photo_path)
       VALUES (1, '', '', '', '', '', '', '/images/portrait.webp')`
    ).run();
    row = db.prepare('SELECT * FROM profile WHERE id = 1').get() as Profile;
  }
  return row;
}

export function updateProfile(data: Partial<Profile>): void {
  getProfile();
  const current = getProfile();
  const merged = { ...current, ...data };
  db.prepare(
    `UPDATE profile SET bio_1=@bio_1, bio_2=@bio_2, location=@location, formation=@formation,
     availability=@availability, languages=@languages, photo_path=@photo_path WHERE id = 1`
  ).run(merged);
}

export interface EventGeo {
  countryCode: string | null;
  country: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

export type EventType = 'page_view' | 'cv_download' | 'link_click';

export function logEvent(type: EventType, meta?: string, geo?: EventGeo, referrer?: string): void {
  db.prepare(
    `INSERT INTO events (type, meta, country_code, country, city, lat, lon, referrer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    type,
    meta ?? null,
    geo?.countryCode ?? null,
    geo?.country ?? null,
    geo?.city ?? null,
    geo?.lat ?? null,
    geo?.lon ?? null,
    referrer ?? null
  );
  liveEvents.emit('event', { type, meta });
}

function countBetween(type: string, start: Date, end: Date): number {
  const iso = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
  return (
    db
      .prepare("SELECT COUNT(*) as n FROM events WHERE type = ? AND created_at >= ? AND created_at < ?")
      .get(type, iso(start), iso(end)) as { n: number }
  ).n;
}

export type PeriodType = 'day' | 'week' | 'month';

function periodRange(type: PeriodType, dateStr: string) {
  const ref = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(ref.getTime())) throw new Error('invalid date');

  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

  let start: Date;
  let end: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (type === 'day') {
    start = ref;
    end = addDays(start, 1);
    prevStart = addDays(start, -1);
    prevEnd = start;
  } else if (type === 'week') {
    const day = ref.getUTCDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start = addDays(ref, diffToMonday);
    end = addDays(start, 7);
    prevStart = addDays(start, -7);
    prevEnd = start;
  } else {
    start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
    end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1));
    prevStart = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1));
    prevEnd = start;
  }

  return { start, end, prevStart, prevEnd };
}

export function getPeriodStats(type: PeriodType, dateStr: string) {
  const { start, end, prevStart, prevEnd } = periodRange(type, dateStr);

  return {
    type,
    date: dateStr,
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    current: {
      pageViews: countBetween('page_view', start, end),
      cvDownloads: countBetween('cv_download', start, end),
      linkClicks: countBetween('link_click', start, end),
    },
    previous: {
      pageViews: countBetween('page_view', prevStart, prevEnd),
      cvDownloads: countBetween('cv_download', prevStart, prevEnd),
      linkClicks: countBetween('link_click', prevStart, prevEnd),
    },
  };
}

export interface ProjectClickStat {
  projectId: number;
  title: string;
  repoClicks: number;
  demoClicks: number;
}

export function getProjectClickStats(): ProjectClickStat[] {
  const rows = db
    .prepare("SELECT meta, COUNT(*) as n FROM events WHERE type = 'link_click' AND meta LIKE 'project:%' GROUP BY meta")
    .all() as { meta: string; n: number }[];

  const byProject = new Map<number, { repoClicks: number; demoClicks: number }>();
  for (const row of rows) {
    // meta format: "project:<id>:<repo|demo>"
    const [, idStr, kind] = row.meta.split(':');
    const id = Number(idStr);
    if (!Number.isInteger(id)) continue;
    const entry = byProject.get(id) ?? { repoClicks: 0, demoClicks: 0 };
    if (kind === 'repo') entry.repoClicks += row.n;
    else if (kind === 'demo') entry.demoClicks += row.n;
    byProject.set(id, entry);
  }

  const results: ProjectClickStat[] = [];
  for (const [id, counts] of byProject) {
    const project = db.prepare('SELECT title FROM projects WHERE id = ?').get(id) as { title: string } | undefined;
    results.push({
      projectId: id,
      title: project?.title ?? `Projet #${id}`,
      repoClicks: counts.repoClicks,
      demoClicks: counts.demoClicks,
    });
  }

  return results.sort((a, b) => b.repoClicks + b.demoClicks - (a.repoClicks + a.demoClicks));
}

export interface ReferrerStat {
  referrer: string;
  n: number;
}

export function getReferrerStats(): ReferrerStat[] {
  return db
    .prepare(
      `SELECT COALESCE(referrer, 'direct') as referrer, COUNT(*) as n
       FROM events WHERE type = 'page_view'
       GROUP BY referrer ORDER BY n DESC`
    )
    .all() as ReferrerStat[];
}

export interface DailySeriesPoint {
  date: string;
  pageViews: number;
  cvDownloads: number;
}

export function getDailySeries(days: number): DailySeriesPoint[] {
  const rows = db
    .prepare(
      `SELECT date(created_at) as date, type, COUNT(*) as n
       FROM events
       WHERE created_at >= datetime('now', ?)
         AND type IN ('page_view', 'cv_download')
       GROUP BY date(created_at), type`
    )
    .all(`-${days} days`) as { date: string; type: string; n: number }[];

  const byDate = new Map<string, { pageViews: number; cvDownloads: number }>();
  for (const row of rows) {
    const entry = byDate.get(row.date) ?? { pageViews: 0, cvDownloads: 0 };
    if (row.type === 'page_view') entry.pageViews = row.n;
    else entry.cvDownloads = row.n;
    byDate.set(row.date, entry);
  }

  const series: DailySeriesPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const dateStr = d.toISOString().slice(0, 10);
    const entry = byDate.get(dateStr) ?? { pageViews: 0, cvDownloads: 0 };
    series.push({ date: dateStr, ...entry });
  }

  return series;
}

export function getStats(periodType: PeriodType = 'day', periodDate?: string) {
  const dateStr = periodDate ?? new Date().toISOString().slice(0, 10);

  const pageViews = (
    db.prepare("SELECT COUNT(*) as n FROM events WHERE type = 'page_view'").get() as { n: number }
  ).n;
  const cvDownloadsByType = db
    .prepare(
      "SELECT meta, COUNT(*) as n FROM events WHERE type = 'cv_download' GROUP BY meta"
    )
    .all() as { meta: string; n: number }[];
  const totalCvDownloads = cvDownloadsByType.reduce((sum, r) => sum + r.n, 0);
  const linkClicksByType = db
    .prepare(
      "SELECT meta, COUNT(*) as n FROM events WHERE type = 'link_click' AND meta NOT LIKE 'project:%' GROUP BY meta"
    )
    .all() as { meta: string; n: number }[];
  const totalLinkClicks = linkClicksByType.reduce((sum, r) => sum + r.n, 0);
  const projectCount = (db.prepare('SELECT COUNT(*) as n FROM projects').get() as { n: number }).n;

  return {
    pageViews,
    totalCvDownloads,
    cvDownloadsByType,
    totalLinkClicks,
    linkClicksByType,
    projectClicks: getProjectClickStats(),
    referrers: getReferrerStats(),
    series: getDailySeries(30),
    projectCount,
    period: getPeriodStats(periodType, dateStr),
  };
}

export interface CountryStat {
  country_code: string;
  country: string;
  visits: number;
  downloads: number;
  clicks: number;
}

export interface LocationPoint {
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
  n: number;
}

export function getLocationStats() {
  const byCountry = db
    .prepare(
      `SELECT country_code, country,
         SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) as visits,
         SUM(CASE WHEN type = 'cv_download' THEN 1 ELSE 0 END) as downloads,
         SUM(CASE WHEN type = 'link_click' THEN 1 ELSE 0 END) as clicks
       FROM events
       WHERE country_code IS NOT NULL
       GROUP BY country_code
       ORDER BY visits DESC`
    )
    .all() as CountryStat[];

  const points = db
    .prepare(
      `SELECT lat, lon, city, country, COUNT(*) as n
       FROM events
       WHERE lat IS NOT NULL AND lon IS NOT NULL
       GROUP BY lat, lon, city
       ORDER BY n DESC`
    )
    .all() as LocationPoint[];

  return { byCountry, points };
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function savePushSubscription(sub: PushSubscriptionInput): void {
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (@endpoint, @p256dh, @auth)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth`
  ).run(sub);
}

export function getPushSubscriptions(): (PushSubscriptionInput & { id: number })[] {
  return db.prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions').all() as (PushSubscriptionInput & {
    id: number;
  })[];
}

export function deletePushSubscription(endpoint: string): void {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as n FROM projects').get() as { n: number }).n;
  if (count > 0) return;

  const seedProjects: ProjectInput[] = [
    {
      slug: 'braidsbook',
      title: 'BraidsBook',
      description:
        "Marketplace de réservation en ligne pour coiffeurs afro/texturés (Montréal, Toronto) : backend Node.js/Express, MySQL, CI/CD GitHub Actions.",
      tags: ['Node.js', 'Express', 'MySQL', 'Google Cloud Platform', 'Clever Cloud', 'GitHub Actions'],
      repo_url: null,
      live_url: 'https://braidsbook.com',
      featured: true,
      order_num: 0,
    },
    {
      slug: 'assistant-ia-supply-chain',
      title: 'Assistant IA agentique — Supply Chain',
      description:
        "Assistant IA agentique déployé sur Azure : RAG sur 50+ PDFs (ChromaDB), 3 outils agentiques et interface Streamlit pour interroger une chaîne d'approvisionnement.",
      tags: ['LangChain', 'Gemini 2.5 Flash', 'RAG', 'ChromaDB', 'Docker', 'Azure', 'Streamlit'],
      repo_url: null,
      live_url: null,
      featured: true,
      order_num: 1,
    },
    {
      slug: 'pipeline-devsecops',
      title: 'Pipeline DevSecOps sécurisé',
      description:
        'Scans de vulnérabilités automatisés (Trivy) intégrés en CI/CD sur 5+ services Docker, avec blocage automatique des builds vulnérables.',
      tags: ['Trivy', 'Docker', 'GitHub Actions', 'CI/CD', 'DevSecOps'],
      repo_url: null,
      live_url: null,
      featured: true,
      order_num: 2,
    },
    {
      slug: 'infra-reseau-zabbix',
      title: 'Infrastructure réseau & supervision Zabbix',
      description:
        'Topologie réseau sous GNS3 (VLANs, routage inter-VLAN, trunk 802.1Q) avec supervision Zabbix : SNMP, alertes temps réel, auto-discovery.',
      tags: ['GNS3', 'VLAN', 'Zabbix', 'SNMP', 'Réseaux'],
      repo_url: null,
      live_url: null,
      featured: false,
      order_num: 3,
    },
    {
      slug: 'pfsense-firewall',
      title: 'Configuration pfSense — Firewall & sécurité',
      description:
        'Déploiement pfSense avec règles de filtrage LAN/WAN/DMZ, VPN OpenVPN et détection d\'intrusions Suricata (IDS/IPS).',
      tags: ['pfSense', 'OpenVPN', 'Suricata', 'IDS/IPS', 'Firewall'],
      repo_url: null,
      live_url: null,
      featured: false,
      order_num: 4,
    },
    {
      slug: 'bankia-risk-engine',
      title: 'Bankia Risk Engine — MLOps AWS',
      description:
        'Moteur de scoring crédit en Machine Learning (AUC > 0.85) exposé via une API Flask, déployé sur AWS Elastic Beanstalk avec CI/CD et suivi MLflow.',
      tags: ['MLflow', 'Flask', 'AWS', 'Elastic Beanstalk', 'CI/CD', 'Machine Learning'],
      repo_url: null,
      live_url: null,
      featured: true,
      order_num: 5,
    },
    {
      slug: 'bug-bounty-yeswehack',
      title: 'Bug bounty — YesWeHack VDP',
      description:
        'Recherche de vulnérabilités en continu sur des programmes de disclosure responsable : reconnaissance OSINT, tests SQLi/XSS/IDOR/SSRF, rédaction de rapports.',
      tags: ['Bug Bounty', 'OSINT', 'Pentest', 'PortSwigger'],
      repo_url: null,
      live_url: null,
      featured: false,
      order_num: 6,
    },
  ];

  const insert = db.transaction((items: ProjectInput[]) => {
    for (const item of items) createProject(item);
  });
  insert(seedProjects);

  updateProfile({
    bio_1:
      "22 ans, je navigue entre deux mondes qui se recoupent de plus en plus : l'administration système/réseaux & la cybersécurité d'un côté, la data et l'IA de l'autre. J'ai durci des serveurs Linux, administré des infrastructures Cisco et supervisé des réseaux en production, avant de me spécialiser en Data Analytics et de construire des pipelines DevSecOps et des assistants IA agentiques (LangChain, RAG) déployés en production.",
    bio_2:
      "Je recherche une alternance de 12 mois à partir de septembre 2026, idéalement sur un poste à l'intersection data / cybersécurité / infra. Curieux et autonome, je pratique le CTF (RootMe, 50+ challenges) et le bug bounty (YesWeHack) en continu.",
    location: 'Paris, France',
    formation: 'F2i, Paris — Master Ingénieur Système Réseaux Cybersécurité',
    availability: 'Alternance 12 mois (sept. 2026)',
    languages: 'Français (natif), Anglais B1-B2',
    photo_path: '/images/portrait.webp',
  });
}

function seedCvsIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as n FROM cvs').get() as { n: number }).n;
  if (count > 0) return;

  createCv({
    slug: 'reseaux-cybersecurite',
    label: 'CV — Réseaux & Cybersécurité',
    file_path: '/cv/matane-mansour-cv-reseaux-cybersecurite.pdf',
  });
  createCv({
    slug: 'data-ia',
    label: 'CV — Data & IA',
    file_path: '/cv/matane-mansour-cv-data-ia.pdf',
  });
}

seedIfEmpty();
seedCvsIfEmpty();

export default db;
