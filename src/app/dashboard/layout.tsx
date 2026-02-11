import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6">
        <div className="md:hidden mb-4">
          <MobileSidebar />
        </div>
        {children}
      </div>
    </div>
  );
}
