"use client";

import { useEffect, useState } from "react";
import { apiFetch, getSession, setSession, User } from "@/lib/api/client";
import { connectWallet, getConnectedWallet, shortAddress, watchConnectedWallet } from "@/lib/web3/provider";

export function WalletCard({ onConnected }: { onConnected?(address: string): void }) {
  const [linkedAddress, setLinkedAddress] = useState("");
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    setLinkedAddress(wallet ?? "");
    void getConnectedWallet().then(setConnectedAddress);
    return watchConnectedWallet(setConnectedAddress);
  }, []);

  async function connectAndVerify() {
    setBusy(true);
    setMessage("");
    try {
      const { signer, address: wallet } = await connectWallet();
      setConnectedAddress(wallet);
      const nonce = await apiFetch<{ message: string }>("/auth/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ address: wallet }),
      });
      const signature = await signer.signMessage(nonce.message);
      await apiFetch("/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ address: wallet, signature }),
      });
      const user = await apiFetch<User>("/auth/me");
      const session = getSession();
      if (session) setSession({ ...session, user });
      setLinkedAddress(user.wallets[0] ?? wallet);
      onConnected?.(wallet);
      setMessage("Ví đã được kết nối và xác minh.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối ví");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="label">{linkedAddress ? "Ví đã xác minh trong tài khoản" : "Chưa liên kết ví"}</p>
        <p className="mt-1 font-mono font-semibold">{shortAddress(linkedAddress)}</p>
        <p className="mt-1 text-xs text-slate-500">{walletConnectionLabel(linkedAddress, connectedAddress)}</p>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
      </div>
      <button className="btn-secondary" disabled={busy} onClick={connectAndVerify}>
        {busy ? "Đang xác minh..." : "Kết nối và xác minh MetaMask"}
      </button>
    </div>
  );
}

function walletConnectionLabel(linkedAddress: string, connectedAddress: string | null) {
  if (!linkedAddress) {
    return connectedAddress
      ? `MetaMask đang kết nối ${shortAddress(connectedAddress)}, nhưng ví chưa được xác minh với tài khoản.`
      : "Kết nối MetaMask và ký thông điệp để xác minh quyền sở hữu ví.";
  }
  if (!connectedAddress) return "Ví đã liên kết, nhưng MetaMask hiện chưa kết nối.";
  if (linkedAddress.toLowerCase() === connectedAddress.toLowerCase()) {
    return "MetaMask đang kết nối đúng ví đã xác minh.";
  }
  return `MetaMask đang dùng ${shortAddress(connectedAddress)}, không khớp ví đã xác minh.`;
}
