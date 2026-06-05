"use client";

import { BrowserProvider } from "ethers";

export async function connectWallet(): Promise<BrowserProvider> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  return new BrowserProvider(window.ethereum);
}

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    };
  }
}

