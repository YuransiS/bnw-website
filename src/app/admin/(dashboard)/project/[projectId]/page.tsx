import React from "react";
import { checkProjectAccess, getUnifiedCRMData } from "../../../actions";
import { createAdminClient } from "@/utils/supabase/server";
import LeadsDashboard from "../../../LeadsDashboard";
import { VideoTutorialButton } from "@/components/ui/VideoTutorialModal";

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

  // 3. Load unified data for project slug defaulting to current month (matching UI preset)
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const initialData = await getUnifiedCRMData(project.slug, {
    startDate,
    endDate
  });

  const cellName = (project.cells as any)?.name || "Проект";

  return (
    <div className="space-y-4">
      {/* Prominent Project Workspace Header */}
      <div className="bg-neutral-900 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-lg flex-wrap">
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

        <div className="flex items-center gap-3">
          <VideoTutorialButton
            videoId="QCzsJsLaL5c"
            title={`Відеоінструкція: Робота з проєктом ${project.name}`}
            badge="Розділ проєкту"
            description="Огляд воронки, лідів, аналітики оплат, кабінету Meta Ads та налаштувань проєкту"
            label="Відеоінструкція"
          />
        </div>
      </div>

      <LeadsDashboard initialData={initialData} />
    </div>
  );
}
