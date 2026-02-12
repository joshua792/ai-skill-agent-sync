import { currentUser } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { isAdmin } from "@/lib/admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const admin = user ? isAdmin(user.id) : false;

  return (
    <div className="flex">
      <Sidebar isAdmin={admin} />
      <div className="flex-1 p-4 md:p-6">
        <div className="md:hidden mb-4">
          <MobileSidebar isAdmin={admin} />
        </div>
        {children}
      </div>
    </div>
  );
}
