import { NextRequest, NextResponse } from "next/server";

declare global {
  var authAddressStorage: Map<string, { mnemonic: string; fid: number; createdAt: number }> | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, auth_address, mnemonic } = body;

    if (!fid || !auth_address || !mnemonic) {
      return NextResponse.json(
        { error: "fid, auth_address, and mnemonic are required" },
        { status: 400 }
      );
    }

    if (!global.authAddressStorage) {
      global.authAddressStorage = new Map();
    }

    const storageKey = `${fid}:${auth_address}`;
    global.authAddressStorage.set(storageKey, {
      mnemonic,
      fid,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Auth address mnemonic stored",
    });
  } catch (error) {
    console.error("Error storing auth address:", error);
    return NextResponse.json(
      {
        error: "Failed to store auth address",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");
    const auth_address = searchParams.get("auth_address");

    if (!fid || !auth_address) {
      return NextResponse.json(
        { error: "fid and auth_address are required" },
        { status: 400 }
      );
    }

    if (!global.authAddressStorage) {
      return NextResponse.json(
        { error: "No auth addresses stored" },
        { status: 404 }
      );
    }

    const storageKey = `${fid}:${auth_address}`;
    const stored = global.authAddressStorage.get(storageKey);

    if (!stored) {
      return NextResponse.json(
        { error: "Auth address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      fid: stored.fid,
      auth_address,
      createdAt: stored.createdAt,
      exists: true,
    });
  } catch (error) {
    console.error("Error retrieving auth address:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve auth address",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
