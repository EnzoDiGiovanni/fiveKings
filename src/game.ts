// Logique pure du compteur : aucune dépendance au DOM ni au stockage.

export type Score = number | null;

export type Game = {
  id: string;
  createdAt: string;
  players: string[];
  rounds: number;
  scores: Score[][]; // scores[manche][joueur], null = non saisi
  finished: boolean;
};

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 7;
const TRUMPS = ['3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi'];

/** Une partie compte toujours 11 manches : des 3 jusqu'aux Rois. */
export const ROUNDS = TRUMPS.length;

/** Une manche est désignée par son atout (« 3 », …, « Roi ») plutôt que par un numéro. */
export type RoundInfo = { trump: string; cards: number; name: string };

/** Infos d'une manche (index 0-based) : atout, nombre de cartes et nom (« Manche des Valets »). */
export function roundInfo(index: number): RoundInfo {
  const trump = TRUMPS[index % TRUMPS.length];
  const plural = /^\d+$/.test(trump) ? trump : `${trump}s`;
  return { trump, cards: index + 3, name: `Manche des ${plural}` };
}

/** Abréviation pour les petits espaces : 3 … 10, V, D, R. */
export function roundShort(index: number): string {
  const { trump } = roundInfo(index);
  return /^\d+$/.test(trump) ? trump : trump[0];
}

/** Le premier joueur de la liste distribue la première manche, puis on tourne dans l'ordre. */
export function dealerIndex(roundIndex: number, playerCount: number): number {
  return playerCount > 0 ? roundIndex % playerCount : 0;
}

/** Indices des joueurs sans score pour cette manche. */
export function missingPlayers(row: Score[]): number[] {
  return row.flatMap((s, i) => (s === null ? [i] : []));
}

export function createGame(players: string[], id: string = newId()): Game {
  return {
    id,
    createdAt: new Date().toISOString(),
    players: [...players],
    rounds: ROUNDS,
    scores: Array.from({ length: ROUNDS }, () => players.map(() => null)),
    finished: false,
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Normalise un nom de joueur (espaces superflus). */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Retourne un message d'erreur si le nom ne peut pas être ajouté, sinon null. */
export function validateNewPlayer(name: string, existing: string[]): string | null {
  const n = normalizeName(name);
  if (!n) return "Écrivez un prénom avant d'appuyer sur Ajouter.";
  if (existing.length >= MAX_PLAYERS) return `On ne peut pas jouer à plus de ${MAX_PLAYERS}.`;
  if (existing.some((p) => p.toLocaleLowerCase('fr') === n.toLocaleLowerCase('fr'))) {
    return `${n} est déjà dans la liste. Ajoutez une initiale pour les distinguer (par exemple ${n} B.).`;
  }
  return null;
}

/** Parse une saisie utilisateur : entier ≥ 0, ou null si vide / invalide. */
export function parseScore(raw: string): Score {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

export function totals(game: Game): number[] {
  return game.players.map((_, p) =>
    game.scores.reduce((sum, row) => sum + (row[p] ?? 0), 0),
  );
}

export function isRoundComplete(row: Score[]): boolean {
  return row.length > 0 && row.every((s) => s !== null);
}

/** Index de la première manche incomplète, ou -1 si tout est saisi. */
export function currentRoundIndex(game: Game): number {
  return game.scores.findIndex((row) => !isRoundComplete(row));
}

export function isGameFinished(game: Game): boolean {
  return game.scores.length === game.rounds && currentRoundIndex(game) === -1;
}

export function hasAnyScore(game: Game): boolean {
  return game.scores.some((row) => row.some((s) => s !== null));
}

/** Indices des joueurs au total le plus bas (vide si aucun score saisi). */
export function leaders(game: Game): number[] {
  if (!hasAnyScore(game)) return [];
  const t = totals(game);
  const min = Math.min(...t);
  return t.flatMap((v, i) => (v === min ? [i] : []));
}

export type RankingEntry = { rank: number; player: string; index: number; total: number };

/** Classement par total croissant ; ex æquo au même rang (1, 1, 3…). Ordre stable sinon. */
export function ranking(game: Game): RankingEntry[] {
  const t = totals(game);
  const sorted = game.players
    .map((player, index) => ({ player, index, total: t[index] }))
    .sort((a, b) => a.total - b.total || a.index - b.index);
  return sorted.map((e) => ({
    ...e,
    rank: sorted.findIndex((o) => o.total === e.total) + 1,
  }));
}

/** Noms des gagnants (plusieurs en cas d'égalité). */
export function winners(game: Game): string[] {
  return ranking(game).filter((e) => e.rank === 1).map((e) => e.player);
}

/** Retourne une nouvelle partie avec le score modifié et l'état « terminée » recalculé. */
export function setScore(game: Game, round: number, player: number, value: Score): Game {
  const scores = game.scores.map((row, r) =>
    r === round ? row.map((s, p) => (p === player ? value : s)) : row,
  );
  const next = { ...game, scores };
  return { ...next, finished: isGameFinished(next) };
}
