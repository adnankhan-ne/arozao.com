import type { ReactNode } from "react";
import PanelShell, { ADMIN_PANEL_LINKS } from "@/components/panels/PanelShell";

export default function AdminPanelShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="arozao-admin-theme">
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap"
      />
      <PanelShell panel="admin" links={ADMIN_PANEL_LINKS}>
        {children}
      </PanelShell>
    </div>
  );
}
