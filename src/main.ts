import '@fontsource/alegreya/latin-700.css';
import '@fontsource/alegreya/latin-800.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import './style.css';
import { renderHome } from './views/home';
import { renderSetup } from './views/setup';
import { renderScoresheet } from './views/scoresheet';

const app = document.getElementById('app')!;

function route(): void {
  const hash = location.hash || '#/';
  const gameMatch = hash.match(/^#\/game\/([^/]+)$/);
  window.scrollTo(0, 0);
  if (hash === '#/new') renderSetup(app);
  else if (gameMatch) renderScoresheet(app, decodeURIComponent(gameMatch[1]));
  else renderHome(app);
}

window.addEventListener('hashchange', route);
route();
