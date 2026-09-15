// scripts/create-production-admin.mjs
// Crée un administrateur en production sans exécuter le seed complet
// (qui effacerait toutes les données existantes).
//
// Usage :
//   ADMIN_EMAIL='contact@panmandarga.sn' \
//   ADMIN_INITIAL_PASSWORD='MotDePasseFort2026!' \
//   ADMIN_NAME='PAN Mandarga Admin' \
//   node scripts/create-production-admin.mjs
//
// Si l'email existe déjà, le mot de passe est mis à jour (utile pour reset).
//
// Prérequis :
//   - Prisma client généré (`npx prisma generate` ou `npm run db:generate`)
//   - DATABASE_URL configurée dans .env
//   - bcryptjs installé (`npm install bcryptjs`)

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_INITIAL_PASSWORD;
const name = process.env.ADMIN_NAME || "Admin";

if (!email || !password) {
  console.error(
    "Usage : ADMIN_EMAIL='...' ADMIN_INITIAL_PASSWORD='...' [ADMIN_NAME='...'] node scripts/create-production-admin.mjs"
  );
  console.error("Variables d'environnement requises :");
  console.error("  ADMIN_EMAIL             — email de l'administrateur");
  console.error("  ADMIN_INITIAL_PASSWORD  — mot de passe initial (>= 8 caractères)");
  console.error("  ADMIN_NAME              — nom affiché (optionnel, défaut : 'Admin')");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Le mot de passe doit faire au moins 8 caractères.");
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Format d'email invalide :", email);
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("→ Création / mise à jour de l'administrateur...");
  console.log("  Email :", email);
  console.log("  Nom   :", name);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name,
      role: "ADMIN",
    },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("");
  console.log("✓ Administrateur créé / mis à jour :");
  console.log("  ID    :", user.id);
  console.log("  Email :", user.email);
  console.log("  Rôle  :", user.role);
  console.log("");
  console.log("→ Vous pouvez maintenant vous connecter sur /admin/login");
  console.log("  ⚠️  Changez ce mot de passe dès la première connexion si possible.");
}

main()
  .catch((e) => {
    console.error("✗ Erreur :", e.message);
    if (e.code === "P1001") {
      console.error(
        "  → Impossible de se connecter à la base. Vérifiez DATABASE_URL dans .env"
      );
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
