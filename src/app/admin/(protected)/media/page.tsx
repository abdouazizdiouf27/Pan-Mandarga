import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata = { title: "Médias" };

export default async function AdminMediaPage() {
  const media = await db.media.findMany({
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <AdminTopbar title="Bibliothèque média" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <MediaLibrary
          media={media.map((m) => ({
            id: m.id,
            url: m.url,
            alt: m.alt,
            isMain: m.isMain,
            productName: m.product?.name || null,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </main>
    </>
  );
}
