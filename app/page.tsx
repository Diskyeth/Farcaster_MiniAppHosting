"use client";

import { useEffect, useState, useRef } from "react";
import AuthAddressQRModal from "./components/AuthAddressQRModal";
import { createIframeEndpoint, exposeToIframe, type MiniAppHost } from "@farcaster/miniapp-host";
import type * as RpcRequest from "ox/RpcRequest";
import type {
  ReadyOptions,
  SignInOptions,
  SetPrimaryButtonOptions,
  MiniAppHostCapability,
} from "@farcaster/miniapp-core";
import {
  SignIn,
  SignManifest,
  ViewCast,
  ViewProfile,
  ViewToken,
  SendToken,
  SwapToken,
  OpenMiniApp,
  ComposeCast,
  Haptics,
  Back,
} from "@farcaster/miniapp-core";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  [key: string]: unknown;
}

interface SignInData {
  signer_uuid: string;
  fid: number;
  user: NeynarUser;
}

declare global {
  interface Window {
    onSignInSuccess?: (data: SignInData) => void;
    setUserState?: (user: NeynarUser | null) => void;
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export default function Home() {
  const [user, setUser] = useState<NeynarUser | null>(null);
  const [miniAppUrl, setMiniAppUrl] = useState<string>("");
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrApprovalUrl, setQrApprovalUrl] = useState<string>("");

  const handleSignOut = () => {
    localStorage.removeItem("neynar_user");
    localStorage.removeItem("neynar_signer_uuid");
    localStorage.removeItem("neynar_fid");
    setUser(null);
  };

  const handleLoadMiniApp = () => {
    if (!miniAppUrl.trim()) {
      return;
    }

    try {
      new URL(miniAppUrl);
      setLoadedUrl(miniAppUrl);
    } catch (e) {
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLoadMiniApp();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!frameRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = frameRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth_callback") === "true") {
      const fidParam = urlParams.get("fid");
      if (fidParam) {
        const fid = parseInt(fidParam);
        const pendingKey = `pending_signin_${fid}`;
        const pendingData = localStorage.getItem(pendingKey);
        
        if (pendingData) {
          (async () => {
            try {
              const parsed = JSON.parse(pendingData);
              const authAddress = parsed.authAddress;
              
              try {
                const statusResponse = await fetch(`/api/auth-address/status?address=${authAddress}`);
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  
                  if (statusData.status === "approved" || statusData.status === "active") {
                    const verifiedKey = `auth_address_verified_${fid}`;
                    localStorage.setItem(verifiedKey, "true");
                  }
                }
              } catch (statusError) {
                const verifiedKey = `auth_address_verified_${fid}`;
                localStorage.setItem(verifiedKey, "true");
              }
              
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete("auth_callback");
              newUrl.searchParams.delete("fid");
              window.history.replaceState({}, "", newUrl.toString());
              
              localStorage.removeItem(pendingKey);
              setQrModalOpen(false);
            } catch (e) {
            }
          })();
        }
      }
    }

    const storedUser = localStorage.getItem("neynar_user");
    const storedSignerUuid = localStorage.getItem("neynar_signer_uuid");
    
    if (storedUser && storedSignerUuid) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.fid && parsedUser.username) {
          setUser(parsedUser);
        }
      } catch (e) {
        localStorage.removeItem("neynar_user");
        localStorage.removeItem("neynar_signer_uuid");
        localStorage.removeItem("neynar_fid");
        setUser(null);
      }
    }

    const script = document.createElement("script");
    script.src = "https://neynarxyz.github.io/siwn/raw/1.2.0/index.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSignInSuccess = (data: SignInData) => {
      if (data.signer_uuid) {
        localStorage.setItem("neynar_signer_uuid", data.signer_uuid);
        localStorage.setItem("neynar_fid", data.fid.toString());
      }
      
      if (data.user) {
        localStorage.setItem("neynar_user", JSON.stringify(data.user));
        setUser(data.user);
      }
    };

    window.setUserState = setUser;

    return () => {
      const existingScript = document.querySelector(
        'script[src="https://neynarxyz.github.io/siwn/raw/1.2.0/index.js"]'
      );
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      delete window.onSignInSuccess;
      delete window.setUserState;
    };
  }, []);

  useEffect(() => {
    if (loadedUrl) {
      const centerX = (window.innerWidth - 393) / 2;
      const centerY = (window.innerHeight - 600) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [loadedUrl]);

  useEffect(() => {
    if (!loadedUrl || !iframeRef.current) {
      return;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    try {
      const url = new URL(loadedUrl);
      const miniAppOrigin = `${url.protocol}//${url.host}`;
      const miniAppDomain = url.hostname;

      const getBrowserWalletProvider = () => {
        if (typeof window !== 'undefined' && window.ethereum) {
          return window.ethereum;
        }
        return null;
      };

      const ethProvider = getBrowserWalletProvider();

      const context = {
        client: {          
          clientFid: 9152,
          added: false,
          platformType: 'web' as const,
        },
        user: (() => {
          if (!user) {
            return { fid: 0 };
          }
          
          const userContext: {
            fid: number;
            username?: string;
            displayName?: string;
            pfpUrl?: string;
            bio?: string;
            location?: { placeId: string; description: string };
          } = {
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
            pfpUrl: user.pfp_url,
            bio: (user.bio && typeof user.bio === 'string') ? user.bio : undefined,
            location: (() => {
              if (user.location && typeof user.location === 'object') {
                const location = user.location as any;
                const placeId = location.placeId || location.place_id;
                const description = location.description;
                if (placeId || description) {
                  return {
                    placeId: placeId || '',
                    description: description || '',
                  };
                }
              }
              return undefined;
            })(),
          };
          
          return userContext;
        })(),
        features: {
          haptics: false,
          cameraAndMicrophoneAccess: false,
        },
      };

      const miniAppHost = {
        context,
        close: () => {
          setLoadedUrl(null);
        },
        ready: async (options?: Partial<ReadyOptions>) => {
        },
        openUrl: (url: string) => {
          window.open(url, "_blank");
        },
        signIn: async (options: SignIn.SignInOptions) => {
          if (!user || !user.fid) {
            const error = new SignIn.RejectedByUser();
            throw error;
          }

          if (options?.acceptAuthAddress === false) {
          }

          const fid = user.fid;
          const storageKey = `auth_address_${fid}`;

          try {
            let authAddressData: { address: string; app_fid: number; deadline: number; signature: string; sponsor: any } | null = null;
            const storedAuthData = localStorage.getItem(storageKey);
            
            if (storedAuthData) {
              try {
                const parsed = JSON.parse(storedAuthData);
                const now = Math.floor(Date.now() / 1000);
                const hasValidSponsor = parsed.sponsor && 
                  parsed.sponsor.sponsored_by_neynar === false &&
                  parsed.sponsor.fid &&
                  parsed.sponsor.signature;
                
                if (parsed.deadline && parsed.deadline > now && parsed.app_fid && hasValidSponsor) {
                  authAddressData = {
                    address: parsed.address,
                    app_fid: parsed.app_fid,
                    deadline: parsed.deadline,
                    signature: parsed.signature,
                    sponsor: parsed.sponsor,
                  };
                } else {
                  localStorage.removeItem(storageKey);
                }
              } catch (e) {
                localStorage.removeItem(storageKey);
              }
            }

            if (!authAddressData) {
              const generateResponse = await fetch("/api/auth-address/generate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ fid }),
              });

              if (!generateResponse.ok) {
                throw new Error();
              }

              const generateData = await generateResponse.json();
              authAddressData = {
                address: generateData.auth_address,
                app_fid: generateData.app_fid,
                deadline: generateData.deadline,
                signature: generateData.signature,
                  sponsor: generateData.sponsor,
                };

                localStorage.setItem(storageKey, JSON.stringify(authAddressData));
            }

            const verifiedKey = `auth_address_verified_${fid}`;
            let isVerified = localStorage.getItem(verifiedKey) === "true";
            
            if (isVerified && authAddressData) {
              try {
                const statusResponse = await fetch(`/api/auth-address/status?address=${authAddressData.address}`);
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  
                  if (statusData.status !== "approved" && statusData.status !== "active") {
                    isVerified = false;
                    localStorage.removeItem(verifiedKey);
                  }
                }
              } catch (statusError) {
              }
            }
            
            if (isVerified && authAddressData) {
              const nonce = options?.nonce;
              if (!nonce) {
                throw new Error();
              }
              
              const checksummedAddress = getAddress(authAddressData.address);
              const siweMessage = new SiweMessage({
                domain: miniAppDomain,
                address: checksummedAddress,
                statement: "Farcaster Auth",
                uri: miniAppOrigin,
                version: "1",
                chainId: 10,
                nonce: nonce,
                issuedAt: new Date().toISOString(),
                resources: [`farcaster://fid/${fid}`],
              });
              
              const messageToSign = siweMessage.prepareMessage();
              
              try {
                const signResponse = await fetch("/api/auth-address/sign", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    fid: fid,
                    auth_address: checksummedAddress,
                    message: messageToSign,
                  }),
                });

                if (!signResponse.ok) {
                  throw new Error();
                }

                const signData = await signResponse.json();
                
                const returnValue = {
                  signature: signData.signature,
                  message: signData.message,
                  authMethod: "authAddress" as const,
                };
                
                return returnValue;
              } catch (signError) {
                return {
                  signature: authAddressData.signature,
                  message: messageToSign,
                  authMethod: "authAddress" as const,
                };
              }
            }

            let appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
            if (appUrl.includes('localhost') && appUrl.startsWith('https://')) {
              appUrl = appUrl.replace('https://', 'http://');
            }
            const redirectUrl = `${appUrl}?auth_callback=true&fid=${fid}`;

            const registerResponse = await fetch("/api/auth-address/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                address: authAddressData.address,
                app_fid: authAddressData.app_fid,
                deadline: authAddressData.deadline,
                signature: authAddressData.signature,
                redirect_url: redirectUrl,
                sponsor: authAddressData.sponsor,
              }),
            });

            if (!registerResponse.ok) {
              const error = await registerResponse.json();
              
              if (error.code === "InvalidField" && error.property === "signature") {
                localStorage.removeItem(storageKey);
                const generateResponse = await fetch("/api/auth-address/generate", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ fid }),
                });

                if (!generateResponse.ok) {
                  throw new Error();
                }

                const generateData = await generateResponse.json();
                authAddressData = {
                  address: generateData.auth_address,
                  app_fid: generateData.app_fid,
                  deadline: generateData.deadline,
                  signature: generateData.signature,
                  sponsor: generateData.sponsor,
                };

                localStorage.setItem(storageKey, JSON.stringify(authAddressData));
                
                const retryResponse = await fetch("/api/auth-address/register", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    address: authAddressData.address,
                    app_fid: authAddressData.app_fid,
                    deadline: authAddressData.deadline,
                    signature: authAddressData.signature,
                    redirect_url: redirectUrl,
                    sponsor: authAddressData.sponsor,
                  }),
                });

                if (!retryResponse.ok) {
                  throw new Error();
                }
                
                const retryData = await retryResponse.json();
                const neynarApprovalUrl = retryData.redirect_url || retryData.auth_address_approval_url;

                if (!neynarApprovalUrl) {
                  throw new Error();
                }
                
                localStorage.setItem(`pending_signin_${fid}`, JSON.stringify({
                  authAddress: authAddressData.address,
                  timestamp: Date.now(),
                }));

                setQrApprovalUrl(neynarApprovalUrl);
                setQrModalOpen(true);
                
                throw new Error();
              }
              
              throw new Error();
            }

            const registerData = await registerResponse.json();
            const neynarApprovalUrl = registerData.redirect_url || registerData.auth_address_approval_url;

            if (!neynarApprovalUrl) {
              throw new Error();
            }

            localStorage.setItem(`pending_signin_${fid}`, JSON.stringify({
              authAddress: authAddressData.address,
              timestamp: Date.now(),
            }));

            setQrApprovalUrl(neynarApprovalUrl);
            setQrModalOpen(true);
            throw new Error();
          } catch (error) {
            if (error instanceof SignIn.RejectedByUser) {
              throw error;
            }
            throw new Error();
          }
        },
        signManifest: async (options: SignManifest.SignManifestOptions) => {
          return {
            header: "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ",
            payload: "eyJkb21haW4iOiJleGFtcGxlLmNvbSJ9",
            signature: "0x" + "0".repeat(130),
          };
        },
        setPrimaryButton: (options: SetPrimaryButtonOptions) => {
        },
        ethProviderRequest: async (...args: any[]) => {
       
          const provider = getBrowserWalletProvider();
          if (provider && provider.request) {
            try {
              const [method, params] = args;
              return await provider.request({ method, params });
            } catch (error) {
              throw error;
            }
          }
                    throw new Error();
        },
        eip6963RequestProvider: () => {
        },
        addFrame: async () => {
          return {};
        },
        addMiniApp: async () => {
          return {};
        },
        viewCast: async (options: ViewCast.ViewCastOptions) => {
        },
        viewProfile: async (options: ViewProfile.ViewProfileOptions) => {
        },
        viewToken: async (options: ViewToken.ViewTokenOptions) => {
        },
        sendToken: async (options: SendToken.SendTokenOptions) => {
          return {
            success: false as const,
            reason: "rejected_by_user" as const,
          };
        },
        swapToken: async (options: SwapToken.SwapTokenOptions) => {
          return {
            success: false as const,
            reason: "rejected_by_user" as const,
          };
        },
        openMiniApp: async (options: OpenMiniApp.OpenMiniAppOptions) => {
        },
        composeCast: async <close extends boolean | undefined = undefined>(
          options: ComposeCast.Options<close>
        ) => {
          if (options.close === true) {
            return undefined as any;
          }
          return {
            cast: {
              hash: "0x" + "0".repeat(64),
              text: options.text,
              embeds: options.embeds,
              parent: options.parent,
              channelKey: options.channelKey,
            },
          } as any;
        },
        requestCameraAndMicrophoneAccess: async () => {
          throw new Error();
        },
        impactOccurred: async (style: Parameters<Haptics.ImpactOccurred>[0]) => {
        },
        notificationOccurred: async (type: Parameters<Haptics.NotificationOccurred>[0]) => {
        },
        selectionChanged: async () => {
        },
        getCapabilities: async (): Promise<MiniAppHostCapability[]> => {
          return [
            "actions.ready",
            "actions.openUrl",
            "actions.close",
            "actions.setPrimaryButton",
            "actions.signIn",
            "actions.viewCast",
            "actions.viewProfile",
            "actions.composeCast",
            "actions.viewToken",
            "actions.sendToken",
            "actions.swapToken",
            "actions.openMiniApp",
            "actions.requestCameraAndMicrophoneAccess",
            "haptics.impactOccurred",
            "haptics.notificationOccurred",
            "haptics.selectionChanged",
            "back",
          ] as MiniAppHostCapability[];
        },
        getChains: async () => {
          return ["eip155:1"];
        },
        updateBackState: async (state: { visible: boolean }) => {
        },
      };

      const { cleanup } = exposeToIframe({
        iframe: iframeRef.current,
        sdk: miniAppHost,
        miniAppOrigin,
        ethProvider: (ethProvider as any) || undefined,
        debug: true,
      });

      cleanupRef.current = cleanup;
    } catch (error) {
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [loadedUrl, user]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Mini App Host
        </h1>
        
        <div className="flex flex-col items-center gap-4 mb-8">
          {user ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 px-6 py-3 bg-gray-800 text-white rounded-lg shadow-lg">
                {user.pfp_url && (
                  <img
                    src={user.pfp_url}
                    alt={user.display_name || user.username}
                    className="w-10 h-10 rounded-full border-2 border-gray-600"
                  />
                )}
                <span className="font-medium text-lg">
                  {user.display_name || user.username}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div
              className="neynar_signin"
              data-client_id={process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || ""}
              data-success-callback="onSignInSuccess"
              data-theme="dark"
            />
          )}
        </div>

        {user && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-full max-w-2xl">
              <label htmlFor="miniapp-url" className="block text-sm font-medium text-gray-300 mb-2">
                Mini App URL
              </label>
              <div className="flex gap-2">
                <input
                  id="miniapp-url"
                  type="text"
                  value={miniAppUrl}
                  onChange={(e) => setMiniAppUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com/miniapp"
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleLoadMiniApp}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Load
                </button>
              </div>
            </div>
          </div>
        )}

        {loadedUrl && (
          <div
            ref={frameRef}
            className="fixed w-[393px] border border-gray-700 rounded-lg overflow-hidden bg-gray-900 shadow-2xl"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              cursor: isDragging ? "grabbing" : "default",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
            >
              <span className="text-sm text-gray-400 truncate flex-1 mr-2">
                {loadedUrl}
              </span>
              <button
                onClick={() => {
                  if (cleanupRef.current) {
                    cleanupRef.current();
                    cleanupRef.current = null;
                  }
                  setLoadedUrl(null);
                  setMiniAppUrl("");
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors flex-shrink-0"
              >
                Close
              </button>
            </div>
            <iframe
              ref={iframeRef}
              src={loadedUrl}
              className="w-full h-[600px] border-0"
              title="Mini App"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        )}
      </div>
      
      <AuthAddressQRModal
        approvalUrl={qrApprovalUrl}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </main>
  );
}
