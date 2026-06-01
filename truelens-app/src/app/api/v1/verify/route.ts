import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Fallback URL if env is not defined
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${BACKEND_URL}/api/v1/documents/verify-hash`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    
    if (response.ok) {
      return NextResponse.json({
        verified: data.status === "verified",
        document: data,
        message: data.status === "verified" ? "Document Verified ✓" : "Verification Failed: Hash Mismatch or Tampering Detected",
      }, { status: 200 });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Verification proxy error:", error);
    return NextResponse.json(
      { error: "Verification failed to connect to backend." },
      { status: 502 }
    );
  }
}
