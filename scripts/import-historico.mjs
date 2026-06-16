#!/usr/bin/env node
/* eslint-disable */
/**
 * Importa el histórico de partidos desde el Excel a Supabase.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/import-historico.mjs <ruta-al-excel.xlsx>
 *
 * Por defecto el script salta partidos que ya existen para esa fecha.
 * Pasá --reset como segundo argumento para borrar todos los matches y
 * reimportar desde cero.
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { readFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('Uso: node scripts/import-historico.mjs <ruta-al-excel.xlsx> [--reset]');
  process.exit(1);
}
const reset = process.argv.includes('--reset');

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ============================================================
// Helpers
// ============================================================

function normalize(s) {
  if (s == null) return '';
  return String(s).trim().toLowerCase();
}

function excelDateToISO(value) {
  if (typeof value === 'number') {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000)
      .toISOString()
      .slice(0, 10);
  }
  if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [d, m, y] = value.split('/').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function timeToIsoSuffix(time, fallback = '20:00') {
  const t = typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time) ? time : fallback;
  return `${t.padStart(5, '0')}:00-03:00`;
}

// ============================================================
// Main
// ============================================================

const wb = XLSX.read(readFileSync(xlsxPath));
const regSheet = wb.Sheets['Registro'];
const jugSheet = wb.Sheets['jugadas '] || wb.Sheets['jugadas'];
if (!regSheet || !jugSheet) {
  console.error('No encuentro las hojas "Registro" y/o "jugadas" en el archivo.');
  process.exit(1);
}

const reg = XLSX.utils.sheet_to_json(regSheet, { defval: null });
const jug = XLSX.utils.sheet_to_json(jugSheet, { defval: null });

// Cargar jugadores de la base
const { data: players, error: playersError } = await supabase
  .from('players')
  .select('id, name');
if (playersError) {
  console.error('Error leyendo players:', playersError);
  process.exit(1);
}
const idByName = new Map();
for (const p of players) idByName.set(normalize(p.name), p.id);

function lookupId(name) {
  return idByName.get(normalize(name)) ?? null;
}

// Reset opcional
if (reset) {
  console.log('--reset: borrando matches existentes...');
  const { error } = await supabase.from('matches').delete().not('id', 'is', null);
  if (error) {
    console.error('No pude borrar matches:', error);
    process.exit(1);
  }
}

// Agrupar Registro por fecha
const matchesByDate = new Map();
for (const row of reg) {
  const fecha = excelDateToISO(row.Fecha);
  if (!fecha) continue;
  if (!matchesByDate.has(fecha)) matchesByDate.set(fecha, []);
  matchesByDate.get(fecha).push(row);
}

console.log(`Encontré ${matchesByDate.size} partidos en "Registro".`);

// Cargar fechas ya importadas para saltar duplicados
const { data: existing } = await supabase.from('matches').select('id, played_at');
const existingByDate = new Map();
for (const m of existing ?? []) {
  const date = new Date(m.played_at).toISOString().slice(0, 10);
  existingByDate.set(date, m.id);
}

// Insertar matches + match_players
const matchIdByDate = new Map(existingByDate);
let imported = 0;
let skipped = 0;
const unknownNames = new Set();

for (const [fecha, rows] of matchesByDate) {
  if (existingByDate.has(fecha)) {
    skipped++;
    continue;
  }

  let scoreA = 0;
  let scoreB = 0;
  let hasTeamInfo = false;
  const outcomes = { Negro: null, Blanco: null };

  for (const r of rows) {
    if (r.Equipo === 'Negro') {
      hasTeamInfo = true;
      scoreA += r['Puntos totales'] || 0;
      outcomes.Negro = r.Resultado;
    } else if (r.Equipo === 'Blanco') {
      hasTeamInfo = true;
      scoreB += r['Puntos totales'] || 0;
      outcomes.Blanco = r.Resultado;
    }
  }

  let winner = null;
  if (hasTeamInfo) {
    if (outcomes.Negro === 'Empate' || outcomes.Blanco === 'Empate') winner = 'tie';
    else if (outcomes.Negro === 'Gana') winner = 'A';
    else if (outcomes.Blanco === 'Gana') winner = 'B';
  }

  const playedAt = `${fecha}T${timeToIsoSuffix('20:00')}`;
  const matchPayload = {
    played_at: playedAt,
    finished_at: hasTeamInfo ? `${fecha}T${timeToIsoSuffix('21:30')}` : null,
    team_a_name: 'Negro',
    team_b_name: 'Blanco',
    score_a: hasTeamInfo ? scoreA : null,
    score_b: hasTeamInfo ? scoreB : null,
    winner,
    partial: !hasTeamInfo,
  };

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert(matchPayload)
    .select('id')
    .single();

  if (matchError) {
    console.error('Error insertando match', fecha, matchError);
    continue;
  }
  matchIdByDate.set(fecha, match.id);

  const playerRows = [];
  for (const r of rows) {
    if (!r.Jugador) continue;
    const pid = lookupId(r.Jugador);
    if (!pid) {
      unknownNames.add(r.Jugador);
      continue;
    }
    if (playerRows.some((p) => p.player_id === pid)) continue;
    playerRows.push({
      match_id: match.id,
      player_id: pid,
      team: r.Equipo === 'Negro' ? 'A' : r.Equipo === 'Blanco' ? 'B' : null,
      outcome: r.Resultado ?? null,
      points: r['Puntos totales'] ?? null,
      doubles: r['Dobles convertidos'] ?? null,
      triples: r['Triples convertidos'] ?? null,
    });
  }

  if (playerRows.length > 0) {
    const { error: mpError } = await supabase.from('match_players').insert(playerRows);
    if (mpError) console.error('Error insertando match_players', fecha, mpError);
  }
  imported++;
}

console.log(`Matches: ${imported} importados, ${skipped} salteados (ya existían).`);

// Insertar plays
let playsInserted = 0;
let playsSkipped = 0;
const playsBatch = [];
for (const row of jug) {
  const fecha = excelDateToISO(row.Fecha);
  if (!fecha) continue;
  const matchId = matchIdByDate.get(fecha);
  if (!matchId) {
    playsSkipped++;
    continue;
  }
  const pid = lookupId(row.Jugador);
  if (!pid) {
    unknownNames.add(row.Jugador);
    playsSkipped++;
    continue;
  }
  const shot = row['Tipo de tiro'] === 'Triple' ? 'triple' : 'double';
  const team = row['Color Eq'] === 'Negro' ? 'A' : 'B';
  const ts = `${fecha}T${timeToIsoSuffix(row.Hora)}`;
  playsBatch.push({
    match_id: matchId,
    ts,
    minute: row.Minuto ?? 0,
    team,
    player_id: pid,
    shot_type: shot,
    points: row.Puntos ?? (shot === 'triple' ? 3 : 2),
  });
}

if (playsBatch.length > 0) {
  // Borrar primero los plays del match para no duplicar (en partidos
  // con play-by-play conviene reemplazar todo).
  const affectedMatches = [...new Set(playsBatch.map((p) => p.match_id))];
  await supabase.from('plays').delete().in('match_id', affectedMatches);

  for (let i = 0; i < playsBatch.length; i += 500) {
    const chunk = playsBatch.slice(i, i + 500);
    const { error } = await supabase.from('plays').insert(chunk);
    if (error) {
      console.error('Error insertando plays chunk', i, error);
    } else {
      playsInserted += chunk.length;
    }
  }
}

console.log(`Plays: ${playsInserted} insertadas, ${playsSkipped} salteadas.`);

if (unknownNames.size > 0) {
  console.warn(
    '\nNombres del Excel que no encontré en la tabla `players` (chequear acentos / typos):',
  );
  for (const n of unknownNames) console.warn(`  - "${n}"`);
}

console.log('\nListo.');
