import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NEYNAR_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      address,
      app_fid,
      deadline,
      signature,
      redirect_url,
      sponsor,
    } = body;

    if (!address || !app_fid || !deadline || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: address, app_fid, deadline, signature" },
        { status: 400 }
      );
    }

    const payload: any = {
      address: address,
      app_fid: parseInt(app_fid),
      deadline: parseInt(deadline),
      signature: signature,
    };

    if (redirect_url) {
      payload.redirect_url = redirect_url;
    }

    if (sponsor) {
      if (sponsor.sponsored_by_neynar === true) {
        payload.sponsor = {
          sponsored_by_neynar: true,
        };
      } else {
        payload.sponsor = {
          fid: parseInt(sponsor.fid || app_fid),
          signature: sponsor.signature || "",
          sponsored_by_neynar: false,
        };
      }
    } else {
    }

    const response = await fetch(
      "https://api.neynar.com/v2/farcaster/auth_address/developer_managed/signed_key/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      let errorText = "";
      let errorJson = null;
      try {
        errorText = await response.text();
        try {
          errorJson = JSON.parse(errorText);
        } catch {
        }
      } catch (e) {
        errorText = "Failed to read error response";
      }
      
      const errorMessage = errorJson?.message || errorText || "Unknown error";
      const errorCode = errorJson?.code || "Unknown";
      const errorProperty = errorJson?.property || "Unknown";
      
      return NextResponse.json(
        {
          error: "Failed to register auth address with Neynar",
          message: errorMessage,
          code: errorCode,
          property: errorProperty,
          details: errorJson || errorText,
          status: response.status,
          payload: {
            address: payload.address,
            app_fid: payload.app_fid,
            deadline: payload.deadline,
            has_signature: !!payload.signature,
            has_sponsor: !!payload.sponsor,
            sponsor_format: payload.sponsor ? {
              has_fid: !!payload.sponsor.fid,
              has_signature: !!payload.sponsor.signature,
              sponsored_by_neynar: payload.sponsor.sponsored_by_neynar,
            } : null,
          },
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const approvalUrl = data.auth_address_approval_url || data.redirect_url || data.url || data.redirectUrl;

    if (!approvalUrl) {
      return NextResponse.json(
        {
          error: "No approval URL returned from Neynar API",
          response: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      redirect_url: approvalUrl,
      auth_address_approval_url: approvalUrl,
      status: data.status,
      address: data.address,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to register auth address",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
