import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// POST /api/v1/scans — Proxy to FastAPI backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, text, contentType } = body;

    if (!contentType || (contentType === "url" && !url) || (contentType === "text" && !text)) {
      return NextResponse.json(
        { error: "Invalid request. Provide either url or text with matching contentType." },
        { status: 400 }
      );
    }

    if (contentType === "text" && text.trim().length < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 characters for meaningful analysis." },
        { status: 400 }
      );
    }

    // Proxy the request to the Python backend
    const response = await fetch(`${BACKEND_URL}/api/v1/scans/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, text, content_type: contentType }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Failed to create scan in backend." },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Map FastAPI response keys to Next.js camelCase expectations
    const scan = {
      ...data,
      contentType: data.content_type,
      trustScore: data.trust_score,
      scanDuration: data.scan_duration,
      createdAt: data.created_at,
      completedAt: data.completed_at
    };

    return NextResponse.json({
      success: true,
      scan,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error connecting to backend." },
      { status: 500 }
    );
  }
}

// GET /api/v1/scans — Proxy list all scans
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/scans/`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch scans from backend." },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Map snake_case to camelCase
    const scans = data.map((d: any) => ({
      ...d,
      contentType: d.content_type,
      trustScore: d.trust_score,
      scanDuration: d.scan_duration,
      createdAt: d.created_at,
      completedAt: d.completed_at
    }));

    // Compute stats
    let avgScore = 0;
    let flaggedCount = 0;
    let authenticCount = 0;

    if (scans.length > 0) {
      const totalScore = scans.reduce((sum: number, scan: any) => sum + (scan.trustScore || 0), 0);
      avgScore = Math.round(totalScore / scans.length);
      
      scans.forEach((scan: any) => {
        if (scan.verdict === "Flagged" || scan.trustScore < 40) flaggedCount++;
        else if (scan.verdict === "Authentic" || scan.trustScore >= 70) authenticCount++;
      });
    }

    return NextResponse.json({
      scans,
      total: scans.length,
      stats: {
        totalScans: scans.length,
        avgScore,
        flaggedCount,
        authenticCount
      }
    });
  } catch (error) {
    console.error("Error fetching scans:", error);
    return NextResponse.json(
      { error: "Failed to fetch scans." },
      { status: 500 }
    );
  }
}
