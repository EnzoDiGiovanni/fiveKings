import {
  type Game,
  createGame,
  currentRoundIndex,
  dealerIndex,
  isRoundComplete,
  leaders,
  missingPlayers,
  parseScore,
  ranking,
  roundInfo,
  roundShort,
  setScore,
  totals,
  winners,
} from '../game';
import { getGame, upsertGame } from '../storage';
import { esc, navigate, saveWarning } from '../ui';

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

function dealerChip(extra = ''): string {
  return `<span class="dealer-chip ${extra}" title="Distribue">D</span>`;
}

export function renderScoresheet(root: HTMLElement, id: string): void {
  const loaded = getGame(id);
  if (!loaded) {
    root.innerHTML = `
      <main class="page">
        <a href="#/" class="back">‹ Accueil</a>
        <div class="paper empty-state">
          <h1>Partie introuvable</h1>
          <p>Elle a peut-être été supprimée.</p>
          <a class="btn btn-gold" href="#/">Retour à l'accueil</a>
        </div>
      </main>`;
    return;
  }
  let game: Game = loaded;
  // Manche affichée (-1 = classement final). Elle reste figée pendant la saisie :
  // on ne passe à la suivante qu'en appuyant sur « Valider la manche ».
  let shown = currentRoundIndex(game);
  // true quand on corrige une manche déjà validée.
  let correcting = false;
  let dealAnimation = false;

  const activeRound = (): number => shown;

  function save(): void {
    saveWarning(upsertGame(game));
  }

  // ---------- Gabarits ----------

  function progressHtml(active: number): string {
    return `<ol class="progress" aria-label="Avancement de la partie">${game.scores
      .map((row, r) => {
        const done = isRoundComplete(row);
        const cls = `${r === active ? 'is-active' : ''} ${done ? 'is-done' : ''}`;
        return `<li class="${cls}" aria-label="${esc(roundInfo(r).name)}${done ? ', jouée' : ''}">${roundShort(r)}</li>`;
      })
      .join('')}</ol>`;
  }

  function roundHtml(r: number): string {
    const info = roundInfo(r);
    const dealer = dealerIndex(r, game.players.length);
    const t = totals(game);
    const rank = roundShort(r);
    const entries = game.players
      .map(
        (p, i) => `
        <li class="entry ${i === dealer ? 'is-dealer' : ''}">
          <label class="entry-who" for="score-${i}">
            <span class="entry-name">${esc(p)}${i === dealer ? dealerChip('small') : ''}</span>
            <span class="entry-total">Total : <b data-total="${i}">${t[i]}</b></span>
          </label>
          <button type="button" class="btn-out" data-out="${i}">A fini (0)</button>
          <input id="score-${i}" class="entry-input" type="text" inputmode="numeric" pattern="[0-9]*"
            maxlength="4" autocomplete="off" enterkeyhint="next" data-p="${i}"
            value="${game.scores[r][i] ?? ''}" placeholder="–" />
        </li>`,
      )
      .join('');

    return `
      ${progressHtml(r)}
      <section class="round" aria-labelledby="round-title">
        <div class="round-head">
          <div class="trump-card ${dealAnimation ? 'is-dealt' : ''}" aria-hidden="true">
            <span class="corner tl">${rank}</span>
            <span class="face">${rank}</span>
            <span class="corner br">${rank}</span>
          </div>
          <div class="round-text">
            <h1 id="round-title">${esc(info.name)}</h1>
            <p>${info.cards} cartes par joueur</p>
            <p class="dealer-line">${dealerChip()}<span><b>${esc(game.players[dealer])}</b> distribue</span></p>
          </div>
        </div>
        ${correcting ? `<p class="note">Vous corrigez une manche déjà jouée.</p>` : ''}
        <div class="paper">
          <p class="paper-hint">Points de chaque joueur pour cette manche</p>
          <ol class="entries">${entries}</ol>
        </div>
        <p class="missing" id="missing" aria-live="polite"></p>
        <button type="button" class="btn btn-gold btn-big" id="validate">
          ${correcting ? 'Enregistrer la correction' : 'Valider la manche'}
        </button>
        ${correcting ? `<button type="button" class="btn btn-quiet" id="cancel-edit">Revenir à la manche en cours</button>` : ''}
      </section>`;
  }

  function endHtml(): string {
    const w = winners(game);
    const rows = ranking(game)
      .map(
        (e) => `
        <li class="rank-row ${e.rank === 1 ? 'is-winner' : ''}">
          <span class="rank-pos">${e.rank === 1 ? '👑' : e.rank}</span>
          <span class="rank-name">${esc(e.player)}</span>
          <span class="rank-total">${e.total} pts</span>
        </li>`,
      )
      .join('');
    return `
      ${progressHtml(-1)}
      <section class="end">
        <h1>${w.length > 1 ? `Égalité entre ${esc(listNames(w))} !` : `Bravo ${esc(w[0])} !`}</h1>
        <p class="end-sub">Partie terminée. Le plus petit score gagne.</p>
        <ol class="paper ranking">${rows}</ol>
        <button type="button" class="btn btn-gold btn-big" id="replay">Rejouer avec les mêmes joueurs</button>
        <a class="btn btn-quiet" href="#/">Retour à l'accueil</a>
      </section>`;
  }

  function tableHtml(active: number): string {
    const lead = new Set(leaders(game));
    const t = totals(game);
    const n = game.players.length;
    const current = currentRoundIndex(game);
    const head = game.players
      .map((p, i) => `<th scope="col" class="${lead.has(i) ? 'is-leader' : ''}"><span>${esc(p)}</span></th>`)
      .join('');
    const body = game.scores
      .map((row, r) => {
        const dealer = dealerIndex(r, n);
        // On ne peut corriger que les manches déjà atteintes.
        const future = current !== -1 && r > current;
        const cells = row
          .map(
            (s, p) =>
              `<td data-r="${r}" data-p="${p}" class="${p === dealer ? 'is-dealer' : ''}">${s ?? ''}</td>`,
          )
          .join('');
        return `
          <tr data-row="${r}" class="${r === active ? 'is-active' : ''} ${future ? 'is-future' : ''}"
            ${future ? '' : `tabindex="0" aria-label="${esc(roundInfo(r).name)} : toucher pour modifier"`}>
            <th scope="row">${esc(roundInfo(r).trump)}</th>${cells}
          </tr>`;
      })
      .join('');
    return `
      <table class="sheet">
        <thead><tr><th scope="col">Atout</th>${head}</tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th scope="row">Total</th>${t
          .map((v, i) => `<td class="${lead.has(i) ? 'is-leader' : ''}" data-foot="${i}">${v}</td>`)
          .join('')}</tr></tfoot>
      </table>`;
  }

  // ---------- Rendu ----------

  function render(): void {
    const r = activeRound();
    root.innerHTML = `
      <main class="page">
        <a href="#/" class="back">‹ Accueil</a>
        ${r === -1 ? endHtml() : roundHtml(r)}
        <section class="sheet-section" aria-labelledby="sheet-title">
          <h2 id="sheet-title">Feuille de score</h2>
          <p class="sheet-hint">Touchez une ligne pour corriger une manche. ${dealerChip('small')} = qui distribue.</p>
          <div class="table-wrap">${tableHtml(r)}</div>
        </section>
        <p id="save-warning" class="warn" hidden>Attention : ce téléphone n'enregistre pas les scores. Ils seront perdus si la page se ferme.</p>
      </main>`;
    dealAnimation = false;
    bind(r);
    updateValidate();
  }

  /** Mise à jour légère pendant la saisie (sans reconstruire les champs, pour garder le clavier ouvert). */
  function refreshNumbers(): void {
    const t = totals(game);
    const lead = new Set(leaders(game));
    root.querySelectorAll<HTMLElement>('[data-total]').forEach((el) => {
      el.textContent = String(t[Number(el.dataset.total)]);
    });
    root.querySelectorAll<HTMLElement>('[data-foot]').forEach((el) => {
      const i = Number(el.dataset.foot);
      el.textContent = String(t[i]);
      el.classList.toggle('is-leader', lead.has(i));
    });
    root.querySelectorAll<HTMLElement>('.sheet thead th').forEach((el, k) => {
      if (k > 0) el.classList.toggle('is-leader', lead.has(k - 1));
    });
    root.querySelectorAll<HTMLElement>('.sheet td[data-r]').forEach((el) => {
      el.textContent = String(game.scores[Number(el.dataset.r)][Number(el.dataset.p)] ?? '');
    });
    root.querySelectorAll<HTMLElement>('.progress li').forEach((el, r) => {
      el.classList.toggle('is-done', isRoundComplete(game.scores[r]));
    });
    updateValidate();
  }

  function updateValidate(): void {
    const btn = root.querySelector<HTMLButtonElement>('#validate');
    const msg = root.querySelector<HTMLElement>('#missing');
    const r = activeRound();
    if (!btn || !msg || r === -1) return;
    const missing = missingPlayers(game.scores[r]).map((i) => game.players[i]);
    btn.disabled = missing.length > 0;
    msg.textContent = missing.length ? `Il manque les points de ${listNames(missing)}.` : '';
  }

  function setCell(p: number, value: number | null): void {
    game = setScore(game, activeRound(), p, value);
    save();
    refreshNumbers();
  }

  function bind(r: number): void {
    const inputs = [...root.querySelectorAll<HTMLInputElement>('.entry-input')];

    inputs.forEach((input, k) => {
      input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '');
        if (digits !== input.value) input.value = digits;
        setCell(Number(input.dataset.p), parseScore(digits));
      });
      input.addEventListener('focus', () => input.select());
      // Entrée : passe au prochain joueur sans score.
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const next = inputs.slice(k + 1).find((i) => i.value === '') ?? inputs[k + 1];
        if (next) next.focus();
        else input.blur();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-out]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const p = Number(btn.dataset.out);
        inputs[p].value = '0';
        setCell(p, 0);
      }),
    );

    root.querySelector('#validate')?.addEventListener('click', () => {
      if (!isRoundComplete(game.scores[r])) return;
      shown = currentRoundIndex(game);
      dealAnimation = !correcting && shown !== -1;
      correcting = false;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    root.querySelector('#cancel-edit')?.addEventListener('click', () => {
      shown = currentRoundIndex(game);
      correcting = false;
      render();
      window.scrollTo({ top: 0 });
    });

    root.querySelector('#replay')?.addEventListener('click', () => {
      const next = createGame(game.players);
      saveWarning(upsertGame(next));
      navigate(`#/game/${encodeURIComponent(next.id)}`);
    });

    const openRow = (tr: HTMLElement) => {
      const row = Number(tr.dataset.row);
      if (row === shown) return;
      correcting = row !== currentRoundIndex(game);
      shown = row;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    root.querySelectorAll<HTMLTableRowElement>('.sheet tbody tr:not(.is-future)').forEach((tr) => {
      tr.addEventListener('click', () => openRow(tr));
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openRow(tr);
        }
      });
    });
  }

  render();
}
