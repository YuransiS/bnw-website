import React from "react";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import AccountSettingsClient from "./AccountSettingsClient";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const userEmail = profile?.email || user.email || "";
  const initialFullName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "";

  return (
    <AccountSettingsClient
      currentUserId={user.id}
      userEmail={userEmail}
      initialFullName={initialFullName}
    />
  );
}
