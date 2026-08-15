# matane-portfolio

Portfolio personnel de Matane Mansour — Astro + Tailwind CSS, déployé en
Docker sur un VPS Contabo via GitHub Actions.

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Contenu

Les projets affichés dans la section "Projets" sont des fichiers Markdown
dans `src/content/projects/`. Modifie-les ou ajoute-en de nouveaux en
suivant le schéma défini dans `src/content/config.ts`.

Le texte de la bio (`src/components/About.astro`), les liens de contact
(`src/components/Contact.astro`) et les compétences
(`src/components/Skills.astro`) sont actuellement des placeholders à
remplacer.

## Déploiement

Voir [docs/VPS_SETUP.md](docs/VPS_SETUP.md) pour la configuration du VPS
Contabo (Docker, Nginx, HTTPS, secrets GitHub Actions). Une fois configuré,
chaque push sur `main` déclenche automatiquement le déploiement.
