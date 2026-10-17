import { describe, expect, it } from 'vitest';
import {
  createGame,
  currentRoundIndex,
  dealerIndex,
  missingPlayers,
  roundShort,
  isGameFinished,
  leaders,
  parseScore,
  ranking,
  ROUNDS,
  roundInfo,
  setScore,
  totals,
  validateNewPlayer,
  winners,
  type Game,
} from '../src/game';

function withScores(players: string[], scores: (number | null)[][]): Game {
  const g = createGame(players, 'test');
  return { ...g, rounds: scores.length, scores };
}

describe('roundInfo', () => {
  it('première manche : les 3, 3 cartes', () => {
    expect(roundInfo(0)).toEqual({ trump: '3', cards: 3, name: 'Manche des 3' });
  });
  it('quatrième manche : les 6, 6 cartes', () => {
    expect(roundInfo(3)).toEqual({ trump: '6', cards: 6, name: 'Manche des 6' });
  });
  it('dernières manches : Valets, Dames, Rois', () => {
    expect(roundInfo(8).name).toBe('Manche des Valets');
    expect(roundInfo(9).name).toBe('Manche des Dames');
    expect(roundInfo(10)).toEqual({ trump: 'Roi', cards: 13, name: 'Manche des Rois' });
  });
  it('une partie compte toujours 11 manches', () => {
    expect(ROUNDS).toBe(11);
    expect(createGame(['A', 'B']).scores).toHaveLength(11);
  });
});

describe('totals', () => {
  it('somme en ignorant les cases vides', () => {
    const g = withScores(['A', 'B'], [[5, 0], [null, 12], [3, null]]);
    expect(totals(g)).toEqual([8, 12]);
  });
});

describe('ranking', () => {
  it('trie par total croissant', () => {
    const g = withScores(['A', 'B', 'C'], [[30, 10, 20]]);
    expect(ranking(g).map((e) => [e.rank, e.player])).toEqual([
      [1, 'B'],
      [2, 'C'],
      [3, 'A'],
    ]);
  });
  it('gère les ex æquo (1, 1, 3)', () => {
    const g = withScores(['A', 'B', 'C', 'D'], [[10, 5, 5, 20]]);
    expect(ranking(g).map((e) => [e.rank, e.player])).toEqual([
      [1, 'B'],
      [1, 'C'],
      [3, 'A'],
      [4, 'D'],
    ]);
    expect(winners(g)).toEqual(['B', 'C']);
  });
  it('ex æquo au milieu', () => {
    const g = withScores(['A', 'B', 'C'], [[1, 7, 7]]);
    expect(ranking(g).map((e) => e.rank)).toEqual([1, 2, 2]);
  });
});

describe('leaders', () => {
  it('aucun meneur sans score', () => {
    expect(leaders(createGame(['A', 'B']))).toEqual([]);
  });
  it('tous les meneurs à égalité', () => {
    expect(leaders(withScores(['A', 'B', 'C'], [[4, 9, 4]]))).toEqual([0, 2]);
  });
});

describe('fin de partie', () => {
  it('détecte la manche courante et la fin', () => {
    let g = withScores(['A', 'B'], [[null, null], [null, null]]);
    expect(currentRoundIndex(g)).toBe(0);
    g = setScore(g, 0, 0, 3);
    expect(currentRoundIndex(g)).toBe(0);
    g = setScore(g, 0, 1, 0);
    expect(currentRoundIndex(g)).toBe(1);
    expect(g.finished).toBe(false);
    g = setScore(g, 1, 0, 0);
    g = setScore(g, 1, 1, 8);
    expect(currentRoundIndex(g)).toBe(-1);
    expect(isGameFinished(g)).toBe(true);
    expect(g.finished).toBe(true);
    g = setScore(g, 1, 1, null);
    expect(g.finished).toBe(false);
  });
  it('setScore ne mute pas la partie', () => {
    const g = createGame(['A'], 'x');
    setScore(g, 0, 0, 4);
    expect(g.scores[0][0]).toBeNull();
  });
});

describe('saisie', () => {
  it('parseScore accepte uniquement les entiers ≥ 0', () => {
    expect(parseScore('12')).toBe(12);
    expect(parseScore(' 0 ')).toBe(0);
    expect(parseScore('')).toBeNull();
    expect(parseScore('-3')).toBeNull();
    expect(parseScore('2.5')).toBeNull();
    expect(parseScore('abc')).toBeNull();
  });
  it('validateNewPlayer refuse vides, doublons et > 7', () => {
    expect(validateNewPlayer('  ', [])).not.toBeNull();
    expect(validateNewPlayer('alice', ['Alice'])).not.toBeNull();
    expect(validateNewPlayer('Bob', ['Alice'])).toBeNull();
    expect(validateNewPlayer('H', ['A', 'B', 'C', 'D', 'E', 'F', 'G'])).not.toBeNull();
  });
});

describe('donneur', () => {
  it('le premier joueur distribue, puis on tourne dans l\'ordre', () => {
    expect([0, 1, 2, 3, 4].map((r) => dealerIndex(r, 3))).toEqual([0, 1, 2, 0, 1]);
    expect(dealerIndex(10, 7)).toBe(3);
    expect(dealerIndex(5, 1)).toBe(0);
  });
});

describe('aides d\'affichage', () => {
  it('roundShort abrège les figures', () => {
    expect([0, 7, 8, 9, 10].map(roundShort)).toEqual(['3', '10', 'V', 'D', 'R']);
  });
  it('missingPlayers liste les scores manquants', () => {
    expect(missingPlayers([3, null, 0, null])).toEqual([1, 3]);
  });
});
