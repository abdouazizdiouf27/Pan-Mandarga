"use client";

import * as React from "react";
import { FinancialDashboard } from "@/components/admin/financial-dashboard";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { RecentOrders } from "@/components/admin/recent-orders";
import { Wallet, BarChart3 } from "lucide-react";

type Tab = "finance" | "analytics";

/**
 * DashboardTabs — sélecteur principal à 2 volets du Dashboard.
 *
 * Affiche en haut une capsule commune avec 2 onglets :
 *   - MÉTRIQUES FINANCIÈRES
 *   - MÉTRIQUES DE FRÉQUENTATION
 *
 * Un seul contenu visible à la fois (pas de scroll long entre les deux familles).
 * Transition légère (fade + slide) entre les volets, sans animation excessive.
 *
 * L'onglet Finance inclut aussi la liste "5 dernières commandes" sous le bloc
 * financier, comme dans la version précédente.
 *
 * L'état actif n'est pas persisté (simple state React). Si l'utilisateur quitte
 * le dashboard et revient, il retombe sur Finance par défaut.
 */
export function DashboardTabs() {
  const [tab, setTab] = React.useState<Tab>("finance");

  return (
    <div className="space-y-6">
      {/* === Sélecteur principal — capsule 2 volets === */}
      <div className="flex justify-center sm:justify-start">
        <div
          role="tablist"
          aria-label="Vue du Dashboard"
          className="inline-flex items-center gap-1 p-1 rounded-full border border-border/60 bg-muted/40 backdrop-blur-sm"
        >
          <TabButton
            active={tab === "finance"}
            onClick={() => setTab("finance")}
            icon={Wallet}
            label="Métriques financières"
          />
          <TabButton
            active={tab === "analytics"}
            onClick={() => setTab("analytics")}
            icon={BarChart3}
            label="Métriques de fréquentation"
          />
        </div>
      </div>

      {/* === Contenu du volet actif === */}
      <div key={tab} className="animate-fade-up">
        {tab === "finance" ? (
          <div className="space-y-6">
            <FinancialDashboard />
            <RecentOrders />
          </div>
        ) : (
          <AnalyticsDashboard />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 px-4 sm:px-5 py-2 text-xs uppercase tracking-premium rounded-full transition-all duration-200 " +
        (active
          ? "bg-foreground text-background shadow-premium-sm font-medium"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
