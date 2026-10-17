import { MAX_PLAYERS, MIN_PLAYERS, createGame, normalizeName, validateNewPlayer } from '../game';
import { upsertGame } from '../storage';
import { esc, navigate, saveWarning } from '../ui';

export function renderSetup(root: HTMLElement): void {
  const players: string[] = [];

  root.innerHTML = `
    <main class="page setup">
      <a href="#/" class="back">‹ Accueil</a>
      <h1>Qui joue ?</h1>
      <p class="lead">Ajoutez les joueurs dans l'ordre où ils sont assis autour de la table. Le premier de la liste distribue en premier.</p>

      <form id="add-form" class="add-form" autocomplete="off">
        <label for="name" class="sr-only">Prénom du joueur</label>
        <input id="name" class="field" type="text" placeholder="Prénom" maxlength="20"
          enterkeyhint="done" autocapitalize="words" />
        <button class="btn btn-light" type="submit">Ajouter</button>
      </form>
      <p id="error" class="error" role="alert"></p>

      <ol id="players" class="paper seat-list" hidden></ol>

      <div class="bottom-bar">
        <button id="start" class="btn btn-gold btn-big" disabled>Commencer la partie</button>
      </div>
      <p id="save-warning" class="warn" hidden>Attention : ce téléphone n'enregistre pas les scores.</p>
    </main>`;

  const form = root.querySelector<HTMLFormElement>('#add-form')!;
  const nameInput = root.querySelector<HTMLInputElement>('#name')!;
  const error = root.querySelector<HTMLElement>('#error')!;
  const list = root.querySelector<HTMLOListElement>('#players')!;
  const start = root.querySelector<HTMLButtonElement>('#start')!;

  function renderList(): void {
    list.hidden = players.length === 0;
    list.innerHTML = players
      .map(
        (p, i) => `
        <li class="seat">
          <span class="seat-num">${i + 1}</span>
          <span class="seat-name">${esc(p)}${i === 0 ? '<span class="seat-note"><span class="dealer-chip small">D</span> distribue en premier</span>' : ''}</span>
          <span class="seat-actions">
            <button type="button" class="icon-btn" data-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter ${esc(p)}">▲</button>
            <button type="button" class="icon-btn" data-move="${i}" data-dir="1" ${i === players.length - 1 ? 'disabled' : ''} aria-label="Descendre ${esc(p)}">▼</button>
            <button type="button" class="icon-btn icon-remove" data-remove="${i}" aria-label="Retirer ${esc(p)}">✕</button>
          </span>
        </li>`,
      )
      .join('');
    const full = players.length >= MAX_PLAYERS;
    nameInput.disabled = full;
    form.querySelector('button')!.disabled = full;
    nameInput.placeholder = full ? `C'est complet (${MAX_PLAYERS} joueurs)` : 'Prénom';
    start.disabled = players.length < MIN_PLAYERS;
    start.textContent =
      players.length === 0
        ? 'Ajoutez au moins un joueur'
        : `Commencer la partie à ${players.length}`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = validateNewPlayer(nameInput.value, players);
    error.textContent = err ?? '';
    if (err) return;
    players.push(normalizeName(nameInput.value));
    nameInput.value = '';
    renderList();
    if (!nameInput.disabled) nameInput.focus();
  });

  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.dataset.remove !== undefined) {
      players.splice(Number(btn.dataset.remove), 1);
    } else if (btn.dataset.move !== undefined) {
      const i = Number(btn.dataset.move);
      const j = i + Number(btn.dataset.dir);
      [players[i], players[j]] = [players[j], players[i]];
    }
    error.textContent = '';
    renderList();
  });

  start.addEventListener('click', () => {
    // Un prénom tapé mais pas encore ajouté : on l'ajoute plutôt que de le perdre.
    if (nameInput.value.trim() && !validateNewPlayer(nameInput.value, players)) {
      players.push(normalizeName(nameInput.value));
    }
    const game = createGame(players);
    saveWarning(upsertGame(game));
    navigate(`#/game/${encodeURIComponent(game.id)}`);
  });

  renderList();
}
