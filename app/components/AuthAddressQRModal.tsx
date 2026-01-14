"use client";

import QRCode from "react-qr-code";

interface AuthAddressQRModalProps {
  approvalUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthAddressQRModal({
  approvalUrl,
  isOpen,
  onClose,
}: AuthAddressQRModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            Scan QR Code to Approve
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="bg-white p-4 rounded-lg">
            <QRCode
              value={approvalUrl}
              size={256}
              level="H"
            />
          </div>

          <div className="text-center text-gray-300 space-y-2">
            <p className="text-sm">
              Scan this QR code with your Farcaster app to sign in.
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
