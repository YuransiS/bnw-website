import React from "react";
import LeadsDashboard from "../LeadsDashboard";
import { getUnifiedCRMData } from "../actions";

// Force dynamic rendering to always show the freshest leads and analytics
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ slug?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialData = await getUnifiedCRMData(params.slug);

  return (
    <LeadsDashboard initialData={initialData} />
  );
}
