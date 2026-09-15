import { getSettings } from "@/lib/settings";
import { MessageCircle } from "lucide-react";

export async function WhatsAppFloating() {
  const settings = await getSettings();
  const phone = settings.whatsapp_number || "221770000000";
  const href = `https://wa.me/${phone}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Commander sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground shadow-lg hover:brightness-110 transition-all px-4 py-3 md:px-5 md:py-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Commander sur WhatsApp</span>
      <span className="sr-only">Ouvrir une conversation WhatsApp</span>
    </a>
  );
}
