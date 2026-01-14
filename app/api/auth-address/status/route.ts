import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NEYNAR API key not set" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "address query is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/auth_address/developer_managed?address=${address}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Failed to check auth address status",
          details: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      status: data.status,
      address: data.address,
      fid: data.fid,
      auth_address_approval_url: data.auth_address_approval_url,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check auth address status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
