"use client";

import { useEffect, useState } from "react";
import { apiFetch, getSession, setSession, User } from "@/lib/api/client";
import { connectWallet, shortAddress } from "@/lib/web3/provider";

export function WalletCard({ onConnected }: { onConnected?(address: string): void }) {
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    if (wallet) setAddress(wallet);
  }, []);

  async function connectAndVerify() {
    setBusy(true);
    setMessage("");
    try {
      const { signer, address: wallet } = await connectWallet();
      setAddress(wallet);
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
      onConnected?.(wallet);
      setMessage("Vi da duoc ket noi va xac minh.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the ket noi vi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="label">Vi da xac minh</p>
        <p className="mt-1 font-mono font-semibold">{shortAddress(address)}</p>
        <p className="mt-1 text-xs text-slate-500">Can MetaMask va chain local 31337 cho cac giao dich blockchain.</p>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
      </div>
      <button className="btn-secondary" disabled={busy} onClick={connectAndVerify}>
        {busy ? "Dang xac minh..." : "Ket noi va xac minh MetaMask"}
      </button>
    </div>
  );
}
