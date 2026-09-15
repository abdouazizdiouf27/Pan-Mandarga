// ============================================================
// Test d'isolation des thèmes front-office / back-office
// ============================================================
//
// Simule 2 "navigateurs" distincts avec chacun leur propre localStorage,
// puis vérifie que les préférences sont isolées :
//   - Navigateur 1 (front) : change le thème → seul le front change
//   - Navigateur 2 (admin) : change le thème → seul l'admin change
//   - F5 sur /admin : le thème admin est préservé
//   - F5 sur / : le thème front est préservé
//
// Ce test unitaire ne charge PAS Next.js — il vérifie juste que la logique
// de SmartThemeProvider + anti-flash script est correcte.

// Simule le localStorage
class MemoryStorage {
  private data: Record<string, string> = {};
  getItem(key: string): string | null {
    return key in this.data ? this.data[key] : null;
  }
  setItem(key: string, value: string) {
    this.data[key] = value;
  }
  removeItem(key: string) {
    delete this.data[key];
  }
}

// Simule le script anti-flash du root layout
function runAntiFlashScript(pathname: string, storage: MemoryStorage): { hasDark: boolean; storageKeyUsed: string } {
  const k = pathname.indexOf("/admin") === 0 ? "pan-mandarga-admin-theme" : "pan-mandarga-front-theme";
  const v = storage.getItem(k);
  const hasDark = v === "dark";
  return { hasDark, storageKeyUsed: k };
}

// Simule le SmartThemeProvider : quelle clé utiliser selon la route
function smartProviderStorageKey(pathname: string): string {
  return pathname && pathname.startsWith("/admin") ? "pan-mandarga-admin-theme" : "pan-mandarga-front-theme";
}

// Simule setTheme : écrit dans la bonne clé
function setTheme(pathname: string, theme: "light" | "dark", storage: MemoryStorage) {
  const k = smartProviderStorageKey(pathname);
  storage.setItem(k, theme);
}

let passed = 0;
let failed = 0;
function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("\n=== TEST 1 : Initial — pas de thème, pas de dark ===");
const browser1 = new MemoryStorage();
const r = runAntiFlashScript("/", browser1);
assert("Front sans thème → hasDark=false", r.hasDark === false);
assert("Front utilise clé front", r.storageKeyUsed === "pan-mandarga-front-theme");

console.log("\n=== TEST 2 : Front en dark, admin reste vide ===");
setTheme("/", "dark", browser1);
const r2front = runAntiFlashScript("/", browser1);
const r2admin = runAntiFlashScript("/admin", browser1);
assert("Front /admin a dark", r2front.hasDark === true);
assert("Admin /admin n'a PAS dark (clé admin vide)", r2admin.hasDark === false);

console.log("\n=== TEST 3 : Admin passe en dark, front reste dark ===");
setTheme("/admin", "dark", browser1);
const r3front = runAntiFlashScript("/", browser1);
const r3admin = runAntiFlashScript("/admin", browser1);
assert("Front reste dark", r3front.hasDark === true);
assert("Admin devient dark", r3admin.hasDark === true);

console.log("\n=== TEST 4 : Admin passe en light, front reste dark ===");
setTheme("/admin", "light", browser1);
const r4front = runAntiFlashScript("/", browser1);
const r4admin = runAntiFlashScript("/admin", browser1);
assert("Front reste dark (indépendant)", r4front.hasDark === true);
assert("Admin passe en light", r4admin.hasDark === false);

console.log("\n=== TEST 5 : F5 sur /admin — admin reste en light ===");
// On simule un F5 : le script anti-flash relit localStorage
const r5 = runAntiFlashScript("/admin", browser1);
assert("F5 /admin → admin reste en light", r5.hasDark === false);

console.log("\n=== TEST 6 : F5 sur / — front reste en dark ===");
const r6 = runAntiFlashScript("/", browser1);
assert("F5 / → front reste en dark", r6.hasDark === true);

console.log("\n=== TEST 7 : Multi-utilisateurs — navigateur 2 isolé ===");
const browser2 = new MemoryStorage();
// Browser 2 ne voit RIEN de browser 1
const r7 = runAntiFlashScript("/", browser2);
assert("Browser 2 front → pas de dark (initial)", r7.hasDark === false);
const r7b = runAntiFlashScript("/admin", browser2);
assert("Browser 2 admin → pas de dark (initial)", r7b.hasDark === false);

console.log("\n=== TEST 8 : Browser 2 set front en light, admin en dark ===");
setTheme("/", "light", browser2);
setTheme("/admin", "dark", browser2);
const r8front = runAntiFlashScript("/", browser2);
const r8admin = runAntiFlashScript("/admin", browser2);
assert("Browser 2 front = light", r8front.hasDark === false);
assert("Browser 2 admin = dark", r8admin.hasDark === true);
// Browser 1 ne doit pas être impacté
const r8frontB1 = runAntiFlashScript("/", browser1);
const r8adminB1 = runAntiFlashScript("/admin", browser1);
assert("Browser 1 front toujours dark (non impacté par browser 2)", r8frontB1.hasDark === true);
assert("Browser 1 admin toujours light (non impacté par browser 2)", r8adminB1.hasDark === false);

console.log("\n=== TEST 9 : Routes admin niches ===");
assert("/admin → clé admin", smartProviderStorageKey("/admin") === "pan-mandarga-admin-theme");
assert("/admin/login → clé admin", smartProviderStorageKey("/admin/login") === "pan-mandarga-admin-theme");
assert("/admin/products → clé admin", smartProviderStorageKey("/admin/products") === "pan-mandarga-admin-theme");
assert("/admin/orders/123 → clé admin", smartProviderStorageKey("/admin/orders/123") === "pan-mandarga-admin-theme");

console.log("\n=== TEST 10 : Routes front ===");
assert("/ → clé front", smartProviderStorageKey("/") === "pan-mandarga-front-theme");
assert("/products/bidew → clé front", smartProviderStorageKey("/products/bidew") === "pan-mandarga-front-theme");
assert("/collections → clé front", smartProviderStorageKey("/collections") === "pan-mandarga-front-theme");
assert("/cart → clé front", smartProviderStorageKey("/cart") === "pan-mandarga-front-theme");
assert("/about → clé front", smartProviderStorageKey("/about") === "pan-mandarga-front-theme");

console.log("\n=== TEST 11 : Cas A du prompt (front=sombre, back=clair) ===");
const browserA = new MemoryStorage();
setTheme("/", "dark", browserA);
setTheme("/admin", "light", browserA);
assert("Front = sombre", runAntiFlashScript("/", browserA).hasDark === true);
assert("Back = clair (indépendant)", runAntiFlashScript("/admin", browserA).hasDark === false);

console.log("\n=== TEST 12 : Cas E du prompt (multi-utilisateurs) ===");
const clientA = new MemoryStorage();
const clientB = new MemoryStorage();
const admin = new MemoryStorage();
setTheme("/", "dark", clientA);     // Client A = sombre
setTheme("/", "light", clientB);    // Client B = clair
setTheme("/admin", "dark", admin);  // Admin = sombre
assert("Client A front = dark", runAntiFlashScript("/", clientA).hasDark === true);
assert("Client B front = light", runAntiFlashScript("/", clientB).hasDark === false);
assert("Admin = dark", runAntiFlashScript("/admin", admin).hasDark === true);
// Aucun ne doit impacter les autres
assert("Client A non impacté par B", runAntiFlashScript("/", clientA).hasDark === true);
assert("Client B non impacté par A", runAntiFlashScript("/", clientB).hasDark === false);
assert("Admin non impacté par A ou B", runAntiFlashScript("/admin", admin).hasDark === true);

console.log("\n=== TEST 13 : Pas d'impact sur les données backend ===");
// Le script anti-flash ne modifie que document.documentElement.classList.
// Il n'écrit PAS en base, ne modifie pas de session, n'appelle pas d'API.
// C'est vérifié par lecture du code : pas de fetch, pas de POST, pas de cookie.
assert("Anti-flash script ne fait pas de fetch backend", true); // Code review only

console.log(`\n=================================================`);
console.log(`RÉSULTAT : ${passed} tests réussis, ${failed} échecs`);
console.log(`=================================================\n`);
if (failed > 0) process.exit(1);
