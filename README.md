# 👑 Les 5 Rois — compteur de points

Feuille de score minimaliste pour une partie de **Les 5 Rois** (Gigamic) jouée autour d'une table.
Aucun compte, aucun serveur : tout est stocké dans le `localStorage` du navigateur.

- 1 à 7 joueurs, 11 manches
- Chaque manche est désignée par son atout (3 → 10, Valet, Dame, Roi) avec son nombre de cartes (3 → 13)
- Saisie une manche à la fois : un gros champ par joueur, bouton « A fini (0) », « Valider la manche »
- Indique qui distribue : le premier joueur de la liste, puis chacun son tour dans l'ordre
- Feuille de score complète en dessous ; toucher une ligne pour corriger une manche
- Totaux en direct, meneur mis en évidence (score le plus bas)
- Classement final avec ex æquo, « Rejouer avec les mêmes joueurs »
- Sauvegarde automatique, mobile d'abord, mode sombre automatique
- Polices Alegreya intégrées au build (aucune requête externe)

## Développement

```sh
npm install
npm run dev      # serveur de dev Vite
npm test         # tests unitaires (Vitest) sur src/game.ts
npm run build    # vérification TypeScript + build dans dist/
npm run preview  # sert le build localement
```

## Structure

```
index.html
src/
  main.ts            routage par hash (#/, #/new, #/game/:id)
  game.ts            logique pure : manches, totaux, classement, fin de partie
  storage.ts         lecture/écriture localStorage + migration de schéma
  ui.ts              petits utilitaires DOM
  views/home.ts      accueil : liste des parties
  views/setup.ts     création de partie
  views/scoresheet.ts feuille de score + classement final
  style.css
tests/game.test.ts
```

Stockage : clé `cinq-rois:games` (tableau de `Game`) et `cinq-rois:version` (schéma, actuellement `1`).
Pour faire évoluer le format, ajouter une étape dans `migrate()` de `src/storage.ts`.

## Déploiement

Le build utilise `base: './'` : le contenu de `dist/` fonctionne tel quel à la racine d'un domaine
comme dans un sous-dossier.

### GitHub Pages

1. Pousser le dépôt sur GitHub (branche `main`).
2. *Settings → Pages → Build and deployment → Source* : choisir **GitHub Actions**.
3. Le workflow `.github/workflows/deploy.yml` lance les tests, build et publie à chaque push sur `main`.

### Netlify / Cloudflare Pages

Commande de build : `npm run build` — dossier publié : `dist`.
