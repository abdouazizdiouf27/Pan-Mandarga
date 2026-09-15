import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { ContentEditor } from "@/components/admin/content-editor";

export const metadata = { title: "Contenu" };

export default async function AdminContentPage() {
  const content = await db.content.findUnique({ where: { slug: "about" } });

  return (
    <>
      <AdminTopbar title="Contenu" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <ContentEditor
          initial={{
            slug: "about",
            title: content?.title || "À propos",
            body: content?.body || "",
          }}
        />
      </main>
    </>
  );
}
