import { type Game, currentRoundIndex, roundInfo, winners } from '../game';
import { deleteGame, loadGames } from '../storage';
import { esc, formatDate, navigate } from '../ui';

function gameStatus(g: Game): string {
  return g.finished
    ? `Gagnant : ${esc(winners(g).join(' et '))}`
    : `En cours : ${esc(roundInfo(currentRoundIndex(g)).name.toLowerCase())}`;
}

export function renderHome(root: HTMLElement): void {
  const games = loadGames().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ongoing = games.find((g) => !g.finished);
  const others = games.filter((g) => g !== ongoing);

  const list = others
    .map(
      (g) => `
      <li class="game-row">
        <a class="game-link" href="#/game/${encodeURIComponent(g.id)}">
          <span class="game-players">${esc(g.players.join(', '))}</span>
          <span class="game-meta">${esc(formatDate(g.createdAt))}</span>
          <span class="game-status">${gameStatus(g)}</span>
        </a>
        <button type="button" class="btn-delete" data-delete="${esc(g.id)}">Supprimer</button>
      </li>`,
    )
    .join('');

  root.innerHTML = `
    <main class="page home">
      <header class="brand">
        <div class="brand-cards" aria-hidden="true">
          <span>3</span><span>V</span><span>R</span>
        </div>
        <h1>Les 5 Rois</h1>
        <p>Le carnet de score de la table</p>
      </header>

      ${
        ongoing
          ? `<a class="resume" href="#/game/${encodeURIComponent(ongoing.id)}">
              <span class="resume-title">Reprendre la partie</span>
              <span class="resume-players">${esc(ongoing.players.join(', '))}</span>
              <span class="resume-status">${gameStatus(ongoing)}</span>
            </a>`
          : ''
      }

      <button type="button" class="btn ${ongoing ? 'btn-light' : 'btn-gold'} btn-big" id="new-game">Nouvelle partie</button>

      ${
        others.length
          ? `<section class="history" aria-labelledby="history-title">
              <h2 id="history-title">Parties précédentes</h2>
              <ul class="paper game-list">${list}</ul>
            </section>`
          : ''
      }
      ${ongoing ? `<button type="button" class="btn-delete btn-delete-ongoing" data-delete="${esc(ongoing.id)}">Supprimer la partie en cours</button>` : ''}
    </main>`;

  root.querySelector('#new-game')!.addEventListener('click', () => navigate('#/new'));
  root.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (confirm('Supprimer cette partie ? Les scores seront effacés définitivement.')) {
        deleteGame(btn.dataset.delete!);
        renderHome(root);
      }
    }),
  );
}
