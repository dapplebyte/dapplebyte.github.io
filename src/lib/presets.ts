import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A product's downloadable preset library (official per-game key layouts plus genre templates):
 * `public/<slug>/presets/v1/latest.json` points at the current version directory, which holds the
 * signed `manifest.json`, one `games/<id>/game.json` per game and the zip the page offers. Version
 * directories never change once published. Products without that file get no presets page or nav tab.
 */
export interface PresetsLatest {
  schema: number;
  version: string;
  published: string;
  /** Relative to the `v1/` directory, e.g. `2026.11.08.4/gamepad-presets-2026.11.08.4.zip`. */
  zip: string;
  zipSize: number;
  zipSha256: string;
}

export interface PresetGame {
  id: string;
  name: string;
  genre: string;
  beta: boolean;
  revision: number;
  /** Scheme display names keyed by the pack's language codes (`en`, `pt`, `zh-TW`, …). */
  schemes: { id: string; displayNames: Record<string, string> }[];
}

export interface PresetLibrary {
  latest: PresetsLatest;
  games: PresetGame[];
  genres: string[];
}

export const PRESETS_DIR = 'presets/v1';
const VERSION = /^\d+(\.\d+){1,5}$/;
const SAFE_ID = /^[a-z0-9_]+$/;
const cache = new Map<string, PresetLibrary | undefined>();

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

/** The product's preset library, or undefined when it publishes none. Throws on a malformed file. */
export function presetLibrary(slug: string): PresetLibrary | undefined {
  if (cache.has(slug)) return cache.get(slug);
  const root = join(process.cwd(), 'public', slug, PRESETS_DIR);
  let out: PresetLibrary | undefined;
  if (existsSync(join(root, 'latest.json'))) {
    const latest = readJson<PresetsLatest>(join(root, 'latest.json'));
    if (!VERSION.test(latest.version ?? '')) throw new Error(`${slug} presets: bad version "${latest.version}"`);
    if (!latest.zip || latest.zip.startsWith('/') || latest.zip.split('/').includes('..')) throw new Error(`${slug} presets: bad zip path "${latest.zip}"`);
    if (!existsSync(join(root, latest.zip))) throw new Error(`${slug} presets: ${latest.zip} is missing`);
    const dir = join(root, latest.version);
    const manifest = readJson<{
      games?: { gameId: string; genre: string; beta?: boolean; revision: number; schemes: string[] }[];
      genres?: { genreId: string }[];
    }>(join(dir, 'manifest.json'));
    const games: PresetGame[] = (manifest.games ?? []).map((g) => {
      if (!SAFE_ID.test(g.gameId)) throw new Error(`${slug} presets: bad game id "${g.gameId}"`);
      const info = readJson<{ name: string; schemes: { id: string; displayNames?: Record<string, string> }[] }>(
        join(dir, 'games', g.gameId, 'game.json'),
      );
      const names = new Map(info.schemes.map((s) => [s.id, s.displayNames ?? {}]));
      return {
        id: g.gameId,
        name: info.name,
        genre: g.genre,
        beta: g.beta === true,
        revision: g.revision,
        schemes: g.schemes.map((id) => ({ id, displayNames: names.get(id) ?? {} })),
      };
    });
    games.sort((a, b) => a.name.localeCompare(b.name));
    out = { latest, games, genres: (manifest.genres ?? []).map((g) => g.genreId) };
  }
  cache.set(slug, out);
  return out;
}

export function hasPresets(slug: string): boolean {
  return presetLibrary(slug) !== undefined;
}

/** Site path of the zip, e.g. `/gamepad-pro/presets/v1/2026.11.08.4/gamepad-presets-2026.11.08.4.zip`. */
export function presetsZipPath(slug: string, latest: PresetsLatest): string {
  return `/${slug}/${PRESETS_DIR}/${latest.zip}`;
}

/** Site locale slug → the pack's language code for scheme names (the app's Android locales). */
const PACK_LANG: Record<string, string> = { 'pt-br': 'pt', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' };

export function schemeName(scheme: PresetGame['schemes'][number], locale: string): string {
  const names = scheme.displayNames;
  return names[PACK_LANG[locale] ?? locale] ?? names.en ?? scheme.id;
}
