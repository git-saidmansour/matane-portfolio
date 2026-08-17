# matane-portfolio

Portfolio personnel de Matane Mansour — Astro (SSR) + Tailwind CSS + SQLite,
déployé en Docker sur un VPS Contabo via GitHub Actions.

## Développement

```bash
npm install
DATA_DIR=.data SESSION_SECRET=dev-secret npm run dev
```

Pour tester le dashboard admin en local, génère un hash et passe-le en env :

```bash
node scripts/hash-password.mjs "motdepasse"
DATA_DIR=.data SESSION_SECRET=dev-secret ADMIN_PASSWORD_HASH=<hash> npm run dev
```

## Build

```bash
npm run build
node ./dist/server/entry.mjs
```

## Contenu

Le contenu (projets, bio, photo) est géré via le dashboard admin sur
`/admin`, protégé par mot de passe (voir `ADMIN_PASSWORD_HASH` /
`SESSION_SECRET` en variables d'environnement). Tout est stocké dans
SQLite (`data/db.sqlite`) et les fichiers uploadés dans `data/uploads/` —
ce dossier est monté en volume Docker et persiste entre les déploiements.

Les compétences (`src/components/Skills.astro`) restent codées en dur
(non éditables depuis le dashboard).

## Déploiement

Voir [docs/VPS_SETUP.md](docs/VPS_SETUP.md) pour la configuration du VPS
Contabo (Docker, Nginx, HTTPS, secrets GitHub Actions, variables du
dashboard admin). Une fois configuré, chaque push sur `main` déclenche
automatiquement le déploiement ; les données du dashboard (projets, bio,
photo, statistiques) survivent aux redéploiements grâce au volume Docker.
