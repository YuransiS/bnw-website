import { NextResponse } from "next/server";
import { rebuildProjectCache } from "@/lib/crmCache";
import { Receiver } from "@upstash/qstash";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    
    // Check if QStash signing keys are configured. If not, bypass signature check (for local development)
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    const qstashToken = process.env.QSTASH_TOKEN;
    
    if (qstashToken && currentKey && nextKey) {
      const signature = request.headers.get("upstash-signature");
      if (!signature) {
        console.error("QStash signature verification failed: Missing upstash-signature header");
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
      
      const receiver = new Receiver({
        currentSigningKey: currentKey,
        nextSigningKey: nextKey,
      });
      
      const isValid = await receiver.verify({
        signature,
        body: rawBody,
      });
      
      if (!isValid) {
        console.error("QStash signature verification failed: Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("⚠️ QStash credentials are not configured in environment variables. Bypassing signature verification.");
    }
    
    const body = JSON.parse(rawBody);
    const { projectId, activeSlug } = body;
    if (!projectId || !activeSlug) {
      return NextResponse.json({ error: "Missing projectId or activeSlug" }, { status: 400 });
    }
    
    console.log(`⏳ Background cache rebuild started via QStash for project: ${activeSlug} (${projectId})...`);
    await rebuildProjectCache(projectId, activeSlug);
    console.log(`✅ Background cache rebuild finished via QStash for project: ${activeSlug}`);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("QStash rebuild-cache handler failed:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
