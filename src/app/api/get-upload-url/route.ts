import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const supabase = getServiceClient();
    
    // Ensure bucket exists
    await supabase.storage.createBucket("inspection-reports", {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });

    const { data, error } = await supabase.storage
      .from("inspection-reports")
      .createSignedUploadUrl(path);

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      signedUrl: data.signedUrl, 
      token: data.token,
      path
    });
  } catch (err: any) {
    console.error("Failed to generate signed upload URL:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
