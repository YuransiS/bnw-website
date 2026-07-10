import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { rebuildProjectCache } from "@/lib/crmCache";

export const maxDuration = 300; // 5 minutes timeout on Vercel
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const authHeader = req.headers.get("Authorization");

    const expectedSecret = process.env.CRON_SECRET;
    const isAuthorized =
      (expectedSecret && secret === expectedSecret) ||
      (expectedSecret && authHeader === `Bearer ${expectedSecret}`) ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch all active projects
    const { data: projects, error: projectsErr } = await adminSupabase
      .from("projects")
      .select("id, name, slug")
      .eq("is_active", true);

    if (projectsErr) {
      throw projectsErr;
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ success: true, message: "No active projects found to rebuild." });
    }

    const qstashToken = process.env.QSTASH_TOKEN;
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const appUrl = `${protocol}://${host}`;

    const triggerPromises = projects.map(async (project) => {
      if (qstashToken) {
        // Trigger via QStash Fan-Out
        console.log(`📡 Triggering background cache rebuild via QStash for project: ${project.slug} (${project.id})`);
        try {
          const res = await fetch(`https://qstash.upstash.io/v2/publish/${appUrl}/api/crm/rebuild-cache`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${qstashToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              projectId: project.id,
              activeSlug: project.slug
            })
          });
          if (!res.ok) {
            console.error(`QStash trigger failed for ${project.slug}:`, await res.text());
            return { project: project.slug, status: "failed_qstash" };
          }
          return { project: project.slug, status: "triggered_qstash" };
        } catch (err: any) {
          console.error(`QStash trigger error for ${project.slug}:`, err);
          return { project: project.slug, status: "error_qstash", error: err.message };
        }
      } else {
        // Fallback: local async trigger (may time out on Vercel if sequentially awaited, so we trigger locally without await if possible)
        console.warn(`⚠️ QStash not configured. Triggering local rebuild for: ${project.slug}`);
        // We trigger it but don't await the full completion here to avoid timeout
        rebuildProjectCache(project.id, project.slug).catch((err) => {
          console.error(`Local cache rebuild failed for ${project.slug}:`, err);
        });
        return { project: project.slug, status: "triggered_locally" };
      }
    });

    const results = await Promise.all(triggerPromises);

    return NextResponse.json({
      success: true,
      message: `Triggered cache rebuild for ${projects.length} projects.`,
      results
    });
  } catch (error: any) {
    console.error("Cron rebuild trigger error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
