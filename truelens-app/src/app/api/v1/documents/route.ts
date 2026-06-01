import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// POST /api/v1/documents/upload — Proxy document analysis/signing to FastAPI
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    // Read the raw bytes from the uploaded file
    const fileBytes = await file.arrayBuffer();
    const buffer = Buffer.from(fileBytes);

    console.log(`[Document Proxy] Forwarding file: name="${file.name}", type="${file.type}", size=${buffer.length}`);

    // Reconstruct using Node.js File (preserves name + type natively)
    const proxyFile = new File([buffer], file.name, {
      type: file.type || "application/octet-stream",
    });

    const proxyForm = new FormData();
    proxyForm.append("file", proxyFile);

    const response = await fetch(`${BACKEND_URL}/api/v1/documents/verify`, {
      method: "POST",
      body: proxyForm,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Document Proxy] Backend returned ${response.status}:`, errorData);
      return NextResponse.json(
        { error: errorData.detail || "Failed to process document in backend." },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Map FastAPI snake_case response to Next.js camelCase expectations
    const document = {
      ...data,
      fileSize: data.file_size,
      fileType: data.file_type,
      trustScore: data.trust_score,
      createdAt: data.created_at,
      signature: data.signature ? {
        documentHash: data.hash,
        signature: data.signature,
        publicKey: data.public_key,
        timestamp: data.verified_at,
        scanId: data.id,
        verdict: data.status,
      } : undefined
    };

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Internal server error connecting to backend." },
      { status: 500 }
    );
  }
}

// GET /api/v1/documents — List all documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '20';

    const response = await fetch(`${BACKEND_URL}/api/v1/documents/?skip=${skip}&limit=${limit}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    
    // Map FastAPI snake_case response to Next.js camelCase expectations
    const documents = data.map((doc: any) => ({
      ...doc,
      fileSize: doc.file_size,
      fileType: doc.file_type,
      trustScore: doc.trust_score,
      createdAt: doc.created_at,
      signature: doc.signature ? {
        documentHash: doc.hash,
        signature: doc.signature,
        publicKey: doc.public_key,
        timestamp: doc.verified_at,
        scanId: doc.id,
        verdict: doc.status,
      } : undefined
    }));

    return NextResponse.json({ documents, total: documents.length });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents." },
      { status: 500 }
    );
  }
}
