import { getSettings } from "@/lib/settings";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { HeroSettingsEditor } from "@/components/admin/hero-settings-editor";

export const metadata = { title: "Paramètres" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <AdminTopbar title="Paramètres" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto scrollbar-premium">
        <div className="mx-auto max-w-5xl space-y-6 md:space-y-8 min-w-0">
          {/* Hero customization — top priority */}
          <section>
            <HeroSettingsEditor initial={settings} />
          </section>

          {/* General settings — brand/contact/social/shop */}
          <SettingsEditor initial={settings} />
        </div>
      </main>
    </>
  );
}
