# Configuration du VPS Contabo pour matane-mansour.com

Suis ces étapes dans l'ordre. Tout se fait en SSH sur le VPS, sauf l'étape 6
(chez le registrar du domaine) et l'étape 9 (sur GitHub).

## 1. Connexion initiale et utilisateur non-root

```bash
ssh root@IP_DU_VPS
adduser deploy
usermod -aG sudo deploy
```

Reconnecte-toi ensuite avec cet utilisateur :

```bash
ssh deploy@IP_DU_VPS
```

## 2. Installer Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 3. Pare-feu (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 4. Clé SSH dédiée au déploiement CI

Génère la paire de clés **en local** (pas sur le VPS) :

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
```

Ajoute la clé publique sur le VPS :

```bash
cat deploy_key.pub | ssh deploy@IP_DU_VPS "cat >> ~/.ssh/authorized_keys"
```

Garde `deploy_key` (la clé privée) — elle ira dans le secret GitHub
`VPS_SSH_PRIVATE_KEY` à l'étape 9. Ne la commite jamais dans le repo.

## 5. Nginx hôte (reverse proxy) + Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Crée `/etc/nginx/sites-available/matane-mansour.com` :

```nginx
server {
    listen 80;
    server_name matane-mansour.com www.matane-mansour.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Active le site :

```bash
sudo ln -s /etc/nginx/sites-available/matane-mansour.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. DNS

Chez le registrar du domaine, crée un enregistrement A :

```
matane-mansour.com       A    IP_DU_VPS
www.matane-mansour.com   A    IP_DU_VPS
```

Attends la propagation (`dig matane-mansour.com` doit renvoyer l'IP du VPS)
avant de passer à l'étape 7.

## 7. HTTPS avec Certbot

```bash
sudo certbot --nginx -d matane-mansour.com -d www.matane-mansour.com
```

Certbot modifie automatiquement la config Nginx pour rediriger en HTTPS et
renouvelle le certificat via un timer systemd (`sudo systemctl status certbot.timer`).

## 8. Dossier de déploiement

```bash
mkdir ~/matane-portfolio
```

Copie le fichier `docker-compose.yml` de ce repo dans `~/matane-portfolio/`
sur le VPS (scp, ou colle le contenu directement).

Si l'image ghcr.io est privée, connecte-toi une fois avec un Personal
Access Token (scope `read:packages`) :

```bash
echo TON_PAT | docker login ghcr.io -u git-saidmansour --password-stdin
```

Le plus simple : après le premier push, va dans
GitHub → ton profil → Packages → matane-portfolio → Package settings →
rends le package **public**. Aucun login n'est alors nécessaire sur le VPS.

Premier lancement manuel pour vérifier :

```bash
cd ~/matane-portfolio
docker compose pull
docker compose up -d
docker ps
```

Le site doit être accessible via `https://matane-mansour.com`.

## 9. Secrets GitHub Actions

Dans le repo GitHub → Settings → Secrets and variables → Actions, ajoute :

| Secret                 | Valeur                                      |
|-------------------------|----------------------------------------------|
| `VPS_HOST`               | IP ou hostname du VPS                        |
| `VPS_USER`               | `deploy`                                     |
| `VPS_SSH_PRIVATE_KEY`    | contenu du fichier `deploy_key` (étape 4)    |
| `VPS_SSH_PORT`           | `22` (optionnel si port standard)            |

Fais ensuite un push sur `main` : le workflow `.github/workflows/deploy.yml`
build l'image, la pousse sur ghcr.io, puis se connecte en SSH au VPS pour
relancer le conteneur.

## 10. Dashboard admin — mot de passe et variables d'environnement

Depuis l'ajout du dashboard (`/admin`), le site est dynamique (SSR + SQLite)
et a besoin de deux secrets **uniquement présents sur le VPS**, jamais dans
le repo : le hash du mot de passe admin, et une clé de signature de session.

Génère le hash de ton mot de passe **en local** (le mot de passe en clair
ne part jamais sur le réseau) :

```bash
node scripts/hash-password.mjs "ton-mot-de-passe-ici"
```

Génère une clé de session aléatoire :

```bash
openssl rand -hex 32
```

Sur le VPS, dans `~/matane-portfolio/`, crée le fichier `.env` (jamais commité) :

```bash
cat > ~/matane-portfolio/.env << 'EOF'
ADMIN_PASSWORD_HASH=colle_ici_le_hash_genere
SESSION_SECRET=colle_ici_la_cle_generee
EOF
chmod 600 ~/matane-portfolio/.env
```

Crée aussi le dossier persistant pour la base de données et les fichiers
uploadés (photo, etc.) — il est monté en volume Docker et survit aux
redéploiements :

```bash
mkdir -p ~/matane-portfolio/data/uploads
```

Relance le conteneur pour prendre en compte le `.env` :

```bash
cd ~/matane-portfolio
docker compose up -d
```

Le dashboard est accessible sur `https://matane-mansour.com/admin`.

## 11. Notifications push (téléchargement de CV)

Génère une paire de clés VAPID (une seule fois, elles ne changent plus ensuite —
en régénérer d'autres invaliderait les abonnements déjà enregistrés) :

```bash
npx web-push generate-vapid-keys
```

Ajoute les trois valeurs à `~/matane-portfolio/.env` sur le VPS (en plus de
`ADMIN_PASSWORD_HASH` et `SESSION_SECRET` déjà présents) :

```bash
cat >> ~/matane-portfolio/.env << 'EOF'
VAPID_PUBLIC_KEY=colle_ici_la_cle_publique
VAPID_PRIVATE_KEY=colle_ici_la_cle_privee
VAPID_SUBJECT=mailto:mansour50said@gmail.com
EOF
docker compose -f ~/matane-portfolio/docker-compose.yml up -d
```

Puis, sur `/admin`, clique "Activer les notifications" (une fois par
navigateur/appareil sur lequel tu veux les recevoir).
