# PAN Mandarga — Déploiement Hostinger (Web Hosting Unlimited / Node.js Web App)

> Ce guide est volontairement orienté débutant. Il remplace le mode VPS/Caddy/systemd de l’ancienne release.

## 1. Compatibilité Hostinger

Hostinger prend en charge les applications Node.js/Next.js sur les offres Business/Unlimited et Cloud compatibles. Le tableau actuel indique 5 sites Node.js pour l’offre Web Unlimited, avec 3 Go de RAM, 50 Go de stockage et 150 bases MySQL. Hostinger prend en charge Node.js 18/20/22/24 ; cette release cible Node.js 22.x.

Sources officielles :
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/
- https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/

## 2. Pourquoi cette release est adaptée

L’ancienne release était préparée pour un VPS Linux avec SQLite + systemd + Caddy. Ce modèle n’est pas adapté au Node.js Web App géré de Hostinger.

La présente release :
- utilise MySQL au lieu de SQLite ;
- utilise `next start` au lieu du serveur standalone piloté par systemd ;
- supprime Caddy/systemd du chemin de déploiement ;
- utilise les variables d’environnement Hostinger ;
- stocke les uploads hors du répertoire `hbuilds/current` ;
- ajoute une route `/api/health` ;
- ajoute une procédure `/admin/setup` à token unique pour créer le premier admin ;
- supprime l’endpoint public de téléchargement du code source ;
- reste compatible avec le back-office existant.

Hostinger précise que chaque déploiement crée une nouvelle version et que les fichiers des répertoires de déploiement sont remplacés lors d’un redéploiement. C’est pourquoi les médias persistants doivent être placés hors de `hbuilds/current`.

## 3. Ce que vous devez avoir avant de commencer

- votre domaine ;
- votre accès hPanel ;
- votre offre Hostinger affichant bien l'option **Node.js Web App** ;
- accès à hPanel ;
- un mot de passe MySQL que vous choisissez ;
- un token de bootstrap aléatoire ;
- la ZIP de cette release.


### Attention si votre domaine héberge déjà un autre site

Hostinger indique actuellement que, si le domaine est déjà utilisé comme site dans hPanel, il peut être nécessaire de supprimer ce site avant de pouvoir créer une nouvelle installation Node.js dessus. Cette opération peut supprimer des fichiers, bases et emails : **faites une sauvegarde avant toute suppression**. Une autre méthode consiste à déployer d'abord l'application sur un domaine temporaire puis à utiliser `Connect domain` dans le tableau de bord Node.js.

## 4. Créer la base MySQL

Dans hPanel :

`Websites → votre site → Databases → Management`

Créez une nouvelle base MySQL et notez exactement :
- nom de base ;
- utilisateur ;
- mot de passe ;
- hôte (généralement `localhost`).

Hostinger indique actuellement que son hébergement partagé/managed utilise MySQL pour les bases locales.

## 5. Préparer les variables

Dans `Environment Variables`, créez :

`DATABASE_URL=mysql://UTILISATEUR:MOT_DE_PASSE@localhost:3306/NOM_BASE`

`NEXTAUTH_URL=https://votre-domaine.tld`

`NEXTAUTH_SECRET=<secret-long-et-aléatoire>`

`AUTH_TRUST_HOST=true`

`UPLOADS_DIR=/home/USERNAME/domains/votre-domaine.tld/storage/uploads`

`BOOTSTRAP_TOKEN=<token-long-et-aléatoire>`

Ne copiez pas littéralement `USERNAME` ni `votre-domaine.tld` : utilisez les valeurs réelles de votre hébergement.

Hostinger permet d’importer les variables depuis un `.env` ou de les saisir individuellement depuis le panneau de déploiement.

## 6. Préparer le stockage persistant

Avec le File Manager ou SSH, créez :

```text
/home/USERNAME/domains/votre-domaine.tld/storage/uploads
```

Puis créez au moins :

```text
products
collections
brand
hero
```

Le dossier `storage` est volontairement hors de `hbuilds/current`.

## 7. Importer les premiers médias

Le dossier `deployment/initial-uploads/` de cette release contient les médias présents dans la version fournie.

Copiez son contenu vers :

```text
/home/USERNAME/domains/votre-domaine.tld/storage/uploads/
```

Vous devez retrouver par exemple :

```text
storage/uploads/brand/...
storage/uploads/products/...
storage/uploads/collections/...
```

## 8. Déployer l’application Node.js

Dans hPanel :

`Websites → Add Website → Deploy Web App → Upload your website files`

Envoyez la ZIP fournie.

Le `package.json` doit être à la racine de l’archive.

Hostinger documente l’upload d’une application Node.js/Next.js sous forme de ZIP ainsi que les réglages de build depuis le panneau.

## 9. Paramètres de build recommandés

Framework : `Next.js` si détecté automatiquement.

Node.js : `22.x`.

Build command :

```bash
npm run hostinger:build
```

Start command :

```bash
npm start
```

L’application écoute sur le port fourni par l’environnement Hostinger via la variable `PORT`, que `next start` utilise automatiquement.

## 10. Création initiale de la base

Le build `npm run hostinger:build` exécute :

```text
prisma generate
→ prisma db push
→ next build
```

Sur une base MySQL neuve, cela crée les tables.

Pour les évolutions futures de schéma, utilisez un vrai workflow Prisma Migrate en développement puis `prisma migrate deploy` en production. `db push` est utilisé ici uniquement pour rendre la première installation simple sur cette release sans historique de migration préalable.

## 11. Importer les données existantes (facultatif mais recommandé)

Cette release fournit `migration/pan-mandarga-current-data.sql`.

Il contient les données de la base SQLite fournie avec la release, à l’exception de la table `User` afin de ne pas réutiliser l’ancien administrateur.

Après un build réussi :

1. ouvrez phpMyAdmin depuis hPanel ;
2. sélectionnez la nouvelle base MySQL ;
3. utilisez `Import` ;
4. importez `migration/pan-mandarga-current-data.sql`.

Le fichier est un jeu d’INSERT et ne recrée pas le schéma. Le schéma est déjà créé par Prisma.

## 12. Vérifier la santé de l’application

Ouvrez :

```text
https://votre-domaine.tld/api/health
```

Vous devez obtenir un JSON avec :

```json
{
  "ok": true,
  "database": "ok",
  "uploads": "ok"
}
```

Si `database` est en erreur : vérifiez `DATABASE_URL`.

Si `uploads` est en erreur : vérifiez `UPLOADS_DIR` et l’existence du dossier.

## 13. Créer le premier compte admin

Ouvrez :

```text
https://votre-domaine.tld/admin/setup
```

Saisissez :
- le token `BOOTSTRAP_TOKEN` ;
- votre email ;
- votre nom ;
- un mot de passe d’au moins 12 caractères.

Cliquez sur `Créer l’administrateur`.

Une fois terminé, supprimez immédiatement `BOOTSTRAP_TOKEN` des variables d’environnement Hostinger, puis redémarrez/redeployez l’application.

Le endpoint refuse toute nouvelle création dès qu’un premier utilisateur existe.

## 14. Connexion au back-office

Ouvrez :

```text
https://votre-domaine.tld/admin/login
```

Utilisez l’email et le mot de passe créés à l’étape précédente.

## 15. Vérifier les médias

Dans le back-office :
- ouvrez Media ;
- vérifiez les images existantes ;
- ajoutez une nouvelle image ;
- rechargez la page ;
- vérifiez que l’image existe toujours.

Faites ensuite un redéploiement test et vérifiez que l’image existe toujours après celui-ci.

## 16. Vérifier les commandes

Testez :
- consultation du storefront ;
- fiche produit ;
- panier ;
- création de commande ;
- réception de la commande dans le back-office ;
- modification du statut ;
- upload média ;
- suppression média.

## 17. Sécurité immédiate après le premier déploiement

Après validation :

- supprimez `BOOTSTRAP_TOKEN` ;
- changez le mot de passe admin s’il s’agissait d’un mot de passe provisoire ;
- vérifiez que `NEXTAUTH_SECRET` est un vrai secret aléatoire ;
- ne laissez jamais `.env` ou les mots de passe dans le ZIP ;
- conservez le fichier SQL/backup hors de la racine publique.

## 18. Sauvegardes

À sauvegarder :

1. la base MySQL depuis hPanel/phpMyAdmin ;
2. le dossier `storage/uploads/` ;
3. une copie de la release source.

## 19. Redéploiement plus tard

Avec Hostinger, le redéploiement peut être déclenché depuis le Dashboard/Deployments. Les variables d’environnement peuvent être réutilisées ; le code est reconstruit dans une nouvelle version.

Ne modifiez pas directement les fichiers dans `hbuilds/current` en production : Hostinger précise que ces fichiers sont gérés par le système de déploiement et peuvent être remplacés lors d’un nouveau déploiement.

## 20. Ancienne architecture VPS

`deployment/legacy-vps/` contient les anciens fichiers Caddy/systemd uniquement comme archive. Ils ne sont PAS à utiliser sur cette installation Hostinger Web/Node.js.
