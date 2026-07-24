import React from "react";
import { getUnifiedCRMData } from "../actions";
import LeadsDashboard from "../LeadsDashboard";

export const revalidate = 0;

export default async function MainLandingSitePage() {
  // Load unified data for B&B Main landing slug
  const initialData = await getUnifiedCRMData("bw_main");

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black uppercase text-white flex items-center gap-2">
            🌐 B&B Main Landing Admin
          </h1>
          <p className="text-xs text-white/40">Окрема адмін-панель головного лендінгу B&B</p>
        </div>
      </div>
      <LeadsDashboard initialData={initialData} />
    </div>
  );
}
