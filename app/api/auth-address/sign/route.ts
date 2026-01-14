import { NextRequest, NextResponse } from "next/server";
import { mnemonicToAccount } from "viem/accounts";

declare global {
  var authAddressStorage: Map<string, { mnemonic: string; fid: number; createdAt: number }> | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, auth_address, message } = body;

    if (!fid || !auth_address || !message) {
      return NextResponse.json(
        { error: "fid, auth_address, and message are required" },
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
        { error: "Auth address not found for this user" },
        { status: 404 }
      );
    }

    const account = mnemonicToAccount(stored.mnemonic);

    if (account.address.toLowerCase() !== auth_address.toLowerCase()) {
      return NextResponse.json(
        { error: "Auth address mismatch" },
        { status: 400 }
      );
    }

    const signature = await account.signMessage({
      message: message,
    });

    return NextResponse.json({
      success: true,
      signature,
      message,
      auth_address: account.address,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to sign message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
