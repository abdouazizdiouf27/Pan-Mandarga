import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { DashboardTabs } from "@/components/admin/dashboard-tabs";

export const metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  return (
    <>
      <AdminTopbar title="Dashboard" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <DashboardTabs />
      </main>
    </>
  );
}
