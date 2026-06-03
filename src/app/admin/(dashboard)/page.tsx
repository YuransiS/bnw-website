import React from "react";
import LeadsDashboard from "../LeadsDashboard";
import BwMainDashboard from "../BwMainDashboard";
import { getUnifiedCRMData, getSessionAndAccess, getDashboardData } from "../actions";

// Force dynamic rendering to always show the freshest leads and analytics
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ slug?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // 1. Resolve active slug based on user session and project permissions
  const { activeSlug } = await getSessionAndAccess(params.slug);

  // 2. Render special B&W Main landing page dashboard if selected
  if (activeSlug === "bw_main") {
    const mainData = await getDashboardData();
    return (
      <BwMainDashboard
        initialLeads={mainData.leads}
        initialPageViews={mainData.pageViews}
        initialClicks={mainData.clicks}
      />
    );
  }

  // 3. Otherwise render default CRM LeadsDashboard with unified analytics
  const initialData = await getUnifiedCRMData(activeSlug);

  return (
    <LeadsDashboard initialData={initialData} />
  );
}
