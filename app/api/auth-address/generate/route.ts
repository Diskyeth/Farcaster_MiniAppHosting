import { NextRequest, NextResponse } from "next/server";
import { encodeAbiParameters } from "viem";
import { mnemonicToAccount, generateMnemonic, english } from "viem/accounts";

declare global {
  var authAddressStorage: Map<string, { mnemonic: string; fid: number; createdAt: number }> | undefined;
}

const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: "Farcaster SignedKeyRequestValidator",
  version: "1",
  chainId: 10,
  verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553",
} as const;

const SIGNED_KEY_REQUEST_TYPE = [
  { name: "requestFid", type: "uint256" },
  { name: "key", type: "bytes" },
  { name: "deadline", type: "uint256" },
] as const;

export async function POST(request: NextRequest) {
  try {
    const appMnemonic = process.env.NEYNAR_APP_MNEMONIC;
    const appFid = process.env.NEYNAR_APP_FID;

    if (!appMnemonic) {
      return NextResponse.json(
        {},
        { status: 500 }
      );
    }

    if (!appFid) {
      return NextResponse.json(
        {},
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fid } = body;

    if (!fid || typeof fid !== "number") {
      return NextResponse.json(
        {},
        { status: 400 }
      );
    }

    const mnemonic = generateMnemonic(english);
    const auth_address_acc = mnemonicToAccount(mnemonic);
    const auth_address = auth_address_acc.address;

    const key = encodeAbiParameters(
      [{ name: "auth_address", type: "address" }],
      [auth_address]
    );

    const account = mnemonicToAccount(appMnemonic);
    const appAddress = account.address;

    const deadline = Math.floor(Date.now() / 1000) + 86400;

    const appFidNum = parseInt(appFid);
    const message = {
      requestFid: BigInt(appFidNum),
      key,
      deadline: BigInt(deadline),
    };

    const signature = await account.signTypedData({
      domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
      types: {
        SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
      },
      primaryType: "SignedKeyRequest",
      message: message,
    });

    const sponsorSignature = await account.signMessage({
      message: { raw: signature },
    });

    if (!global.authAddressStorage) {
      global.authAddressStorage = new Map<string, { mnemonic: string; fid: number; createdAt: number }>();
    }
    const storageKey = `${fid}:${auth_address}`;
    global.authAddressStorage.set(storageKey, {
      mnemonic,
      fid,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      auth_address,
      app_fid: parseInt(appFid),
      signature,
      deadline,
      sponsor: {
        fid: parseInt(appFid),
        signature: sponsorSignature,
        sponsored_by_neynar: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {},
      { status: 500 }
    );
  }
}
