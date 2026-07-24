import React from "react";
import { checkProjectAccess, getUnifiedCRMData } from "../../../actions";
import { createAdminClient } from "@/utils/supabase/server";
import LeadsDashboard from "../../../LeadsDashboard";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDashboardPage({ params }: PageProps) {
  const { projectId } = await params;

  // 1. Verify project-level access permission based on user session role
  try {
    await checkProjectAccess(projectId);
  } catch (err) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-white">
        <div className="text-center p-8 bg-neutral-900 border border-white/5 rounded-2xl max-w-md">
          <h1 className="text-xl font-bold text-red-400 mb-2">Доступ заборонено</h1>
          <p className="text-sm text-white/40">
            Ви не маєте прав для перегляду статистики цього проекту.
          </p>
        </div>
      </div>
    );
  }

  // 2. Fetch project details and cell metadata by UUID
  const adminSupabase = createAdminClient();
  const { data: project } = await adminSupabase
    .from("projects")
    .select("id, name, slug, cell_id, cells(name)")
    .eq("id", projectId)
    .single();

  if (!project) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-white">
        <div className="text-center p-8 bg-neutral-900 border border-white/5 rounded-2xl max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Проект не знайдено</h1>
          <p className="text-sm text-white/40">
            Зазначений унікальний ідентифікатор проекту не існує в базі даних.
          </p>
        </div>
      </div>
    );
  }

  // 3. Load unified data for project slug
  const initialData = await getUnifiedCRMData(project.slug);

  const cellName = (project.cells as any)?.name || "Проект";

  return (
    <div className="space-y-4">
      {/* Prominent Project Workspace Header */}
      <div className="bg-neutral-900 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Ячейка: {cellName}
            </span>
          </div>
          <h1 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            🚀 {project.name}
          </h1>
        </div>
      </div>

      <LeadsDashboard initialData={initialData} />
    </div>
  );
}
