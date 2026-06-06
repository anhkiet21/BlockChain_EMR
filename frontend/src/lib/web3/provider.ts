"use client";

import { BrowserProvider, Contract, Interface, TransactionReceipt, ethers } from "ethers";

export const registryAbi = [
  "function createRecord(address patient,string cid,bytes32 contentHash) returns (uint256)",
  "event RecordCreated(uint256 indexed recordId,address indexed patient,address indexed author,string cid,bytes32 contentHash,uint256 previousRecordId)",
] as const;

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Chua ket noi";
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("Chua cai MetaMask tren browser nay.");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new BrowserProvider(window.ethereum);
  await requireExpectedChain(provider);
  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}

export async function requireExpectedChain(provider: BrowserProvider) {
  const expected = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
  const network = await provider.getNetwork();
  if (network.chainId !== expected) {
    throw new Error(`Sai blockchain network. Hay chuyen MetaMask sang chain ID ${expected}.`);
  }
}

export async function sendPreparedTransaction(transaction: {
  from: string; to: string; data: string; value: string; chainId: string | number;
}) {
  const { provider, signer, address } = await connectWallet();
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(transaction.chainId)) throw new Error("Chain cua transaction khong khop MetaMask.");
  if (address.toLowerCase() !== transaction.from.toLowerCase()) {
    throw new Error("Vi MetaMask hien tai khong khop vi benh nhan trong transaction.");
  }
  const receipt = await signer.sendTransaction({
    to: transaction.to,
    data: transaction.data,
    value: BigInt(transaction.value),
  }).then((tx) => tx.wait());
  if (!receipt) throw new Error("Khong nhan duoc transaction receipt.");
  return receipt;
}

export async function createOnChainRecord(patientWallet: string, doctorWallet: string, cid: string, contentHash: string) {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS chua duoc cau hinh.");
  }
  const { signer, address } = await connectWallet();
  if (address.toLowerCase() !== doctorWallet.toLowerCase()) {
    throw new Error("Vi MetaMask hien tai khong khop vi bac si da xac minh.");
  }
  const contract = new Contract(contractAddress, registryAbi, signer);
  const hash = contentHash.startsWith("0x") ? contentHash : `0x${contentHash}`;
  const receipt = await contract.createRecord(patientWallet, cid, hash).then((tx: { wait(): Promise<TransactionReceipt> }) => tx.wait());
  const parser = new Interface(registryAbi);
  for (const log of receipt.logs) {
    try {
      const parsed = parser.parseLog(log);
      if (parsed?.name === "RecordCreated") return { recordId: parsed.args.recordId.toString(), transactionHash: receipt.hash };
    } catch {
      // Ignore logs emitted by other contracts.
    }
  }
  throw new Error("Transaction thanh cong nhung khong tim thay event RecordCreated.");
}
