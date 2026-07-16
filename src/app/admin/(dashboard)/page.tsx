import { redirect } from "next/navigation";
import { getSessionAndAccess } from "../actions";
import { createAdminClient } from "@/utils/supabase/server";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  // 1. Resolve session and permissions
  const { profile, allowedProjects, user } = await getSessionAndAccess();

  const role = profile.role || "pending";

  // 2. Perform redirect based on role hierarchy
  const isSupervisor = ["admin", "superman", "founder", "developer"].includes(role);

  if (isSupervisor) {
    redirect("/admin/founder");
  }

  if (role === "cell_leader") {
    const adminSupabase = createAdminClient();
    const { data: cells } = await adminSupabase
      .from("cells")
      .select("id")
      .eq("cell_leader_id", user.id)
      .limit(1);

    if (cells && cells.length > 0) {
      redirect(`/admin/cell/${cells[0].id}`);
    } else {
      // Fallback if no cell is linked yet
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center p-8 bg-neutral-900 border border-white/5 rounded-2xl max-w-md">
            <h1 className="text-xl font-bold text-white mb-2">Осередків не знайдено</h1>
            <p className="text-sm text-white/40">
              Ви авторизовані як Керівник ячейки, але за вами не закріплено жодного осередку в базі даних.
            </p>
          </div>
        </div>
      );
    }
  }

  // 3. For project-level roles (producers, sales, experts, marketers)
  if (allowedProjects.length > 0) {
    // If only 1 project is assigned, go straight to it.
    // If multiple are assigned, the sidebar allows switching; we redirect to the first one by default.
    redirect(`/admin/project/${allowedProjects[0].id}`);
  }

  // 4. Default roadblock if no projects or cells mapped
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center p-8 bg-neutral-900 border border-white/5 rounded-2xl max-w-md">
        <h1 className="text-xl font-bold text-white mb-2">Проектів не знайдено</h1>
        <p className="text-sm text-white/40">
          За вашим профілем не закріплено жодного активного проекту. Будь ласка, зверніться до адміністратора.
        </p>
      </div>
    </div>
  );
}
