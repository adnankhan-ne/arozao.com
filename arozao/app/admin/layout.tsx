import "./admin.css";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

export const dynamic = "force-dynamic";

/**
 * Layout for the entire `/admin` portal subtree.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminPanelShell>{children}</AdminPanelShell>
  );
}
