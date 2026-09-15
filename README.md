# PAN Mandarga — Site e-commerce premium

Site e-commerce complet pour la marque PAN Mandarga, avec storefront, back-office sécurisé, commandes WhatsApp et gestion des médias.

## Stack

- Next.js 16 (App Router)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Prisma + MySQL en production
- NextAuth.js v4 (JWT + CredentialsProvider)
- Zustand
- sharp
- framer-motion

## Développement local

```bash
npm install
cp .env.example .env
# adapter DATABASE_URL pour un MySQL local ou de test
npm run db:generate
npm run db:push
npm run dev
```

## Production Hostinger

Cette release est préparée pour le service **Node.js Web App** de Hostinger, pas pour un VPS avec Caddy/systemd. Hostinger prend en charge Next.js sur les offres Web/Cloud compatibles Node.js. Voir `HOSTINGER_DEPLOYMENT.md`.

Build :

```bash
npm run hostinger:build
```

Start :

```bash
npm start
```

Version Node cible : **22.x**.

## Variables d’environnement

Consultez `.env.example`. En production, les variables doivent être saisies dans Hostinger :

- `DATABASE_URL` : MySQL Hostinger
- `UPLOADS_DIR` : dossier persistant hors `hbuilds/current`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `BOOTSTRAP_TOKEN` : token unique pour la première création d’admin

## Première installation

1. créer la base MySQL ;
2. renseigner les variables ;
3. créer le dossier `storage/uploads` ;
4. déployer la ZIP ;
5. attendre le build ;
6. tester `/api/health` ;
7. ouvrir `/admin/setup` ;
8. créer le premier admin ;
9. supprimer `BOOTSTRAP_TOKEN` ;
10. se connecter sur `/admin/login`.

## Données existantes

`migration/pan-mandarga-current-data.sql` contient les données issues de la SQLite fournie dans la release, sans l’ancien utilisateur admin. Importez ce fichier après la création du schéma MySQL si vous souhaitez retrouver le catalogue et les paramètres fournis.

Les médias initiaux se trouvent dans `deployment/initial-uploads/` et doivent être copiés vers le dossier défini par `UPLOADS_DIR`.

## Sécurité

- routes admin protégées par NextAuth ;
- APIs admin protégées côté serveur ;
- aucun mot de passe admin par défaut n’est conservé dans le workflow d’installation ;
- endpoint de téléchargement public du code source supprimé ;
- stockage des médias hors du répertoire de build.

## Archive VPS historique

`deployment/legacy-vps/` contient les anciens fichiers systemd/Caddy uniquement à titre de conservation. Ne pas les utiliser pour le déploiement Hostinger Web/Node.js.
