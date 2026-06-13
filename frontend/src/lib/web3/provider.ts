"use client";

import { BrowserProvider, Contract, Interface, TransactionReceipt, ethers } from "ethers";

export const registryAbi = [
  "error AccessAlreadyGranted(address patient,address grantee)",
  "error AccessAlreadyRevoked(address patient,address grantee)",
  "error AccessDenied(address patient,address caller)",
  "error InvalidFacility()",
  "function createRecord(address patient,string cid,bytes32 contentHash) returns (uint256)",
  "function createRecordVersion(uint256 previousRecordId,string cid,bytes32 contentHash) returns (uint256)",
  "event RecordCreated(uint256 indexed recordId,address indexed patient,address indexed author,string cid,bytes32 contentHash,uint256 previousRecordId)",
  "function createRecordWithMetadata(address patient,string cid,bytes32 contentHash,uint8 sourceType,bytes32 facilityId) returns (uint256)",
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
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Chưa kết nối";
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask trên trình duyệt này.");
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
    throw new Error(`MetaMask đang kết nối sai mạng. Vui lòng chuyển sang mạng có mã ${expected}.`);
  }
}

export async function sendPreparedTransaction(transaction: {
  from: string; to: string; data: string; value: string; chainId: string | number;
}) {
  const { provider, signer, address } = await connectWallet();
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(transaction.chainId)) throw new Error("Mạng MetaMask không phù hợp với giao dịch.");
  if (address.toLowerCase() !== transaction.from.toLowerCase()) {
    throw new Error("Ví MetaMask hiện tại không khớp với ví bệnh nhân đã liên kết.");
  }
  let receipt: TransactionReceipt | null;
  try {
    receipt = await signer.sendTransaction({
      to: transaction.to,
      data: transaction.data,
      value: BigInt(transaction.value),
    }).then((tx) => tx.wait());
  } catch (error) {
    throw new Error(readableContractError(error));
  }
  if (!receipt) throw new Error("Không nhận được kết quả giao dịch.");
  return receipt;
}

function readableContractError(error: unknown) {
  const candidate = error as {
    data?: string;
    shortMessage?: string;
    info?: { error?: { data?: string } };
  };
  const data = candidate?.data ?? candidate?.info?.error?.data;
  if (data) {
    try {
      const parsed = new Interface(registryAbi).parseError(data);
      if (parsed?.name === "AccessAlreadyGranted") return "Quyền truy cập này đã được cấp.";
      if (parsed?.name === "AccessAlreadyRevoked") return "Quyền truy cập này đã được thu hồi.";
      if (parsed?.name === "AccessDenied") return "Ví hiện tại không có quyền thực hiện giao dịch này.";
      if (parsed?.name === "InvalidFacility") return "Cơ sở y tế không hợp lệ hoặc chưa được kích hoạt.";
    } catch {
      // Fall through to the wallet-provided message for unknown contract errors.
    }
  }
  return candidate?.shortMessage ?? (error instanceof Error ? error.message : "Giao dịch thất bại.");
}

export async function createOnChainRecord(patientWallet: string, doctorWallet: string, cid: string, contentHash: string) {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error("Hệ thống xác minh chưa được cấu hình.");
  }
  const { signer, address } = await connectWallet();
  if (address.toLowerCase() !== doctorWallet.toLowerCase()) {
    throw new Error("Ví MetaMask hiện tại không khớp ví bác sĩ đã xác minh.");
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
  throw new Error("Giao dịch thành công nhưng không thể xác nhận hồ sơ.");
}

export async function createOnChainRecordWithMetadata(input: {
  patientWallet: string; uploaderWallet: string; cid: string; contentHash: string;
  sourceType: "PATIENT_UPLOADED" | "DOCTOR_UPLOADED"; facilityId?: string;
}) {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress || !ethers.isAddress(contractAddress)) throw new Error("Hệ thống xác minh chưa được cấu hình.");
  const { signer, address } = await connectWallet();
  if (address.toLowerCase() !== input.uploaderWallet.toLowerCase()) throw new Error("Ví MetaMask không khớp ví đã xác minh.");
  const contract = new Contract(contractAddress, registryAbi, signer);
  const hash = input.contentHash.startsWith("0x") ? input.contentHash : `0x${input.contentHash}`;
  const sourceType = input.sourceType === "PATIENT_UPLOADED" ? 1 : 2;
  const facilityId = input.facilityId ? ethers.encodeBytes32String(input.facilityId) : ethers.ZeroHash;
  const receipt = await contract.createRecordWithMetadata(
    input.patientWallet, input.cid, hash, sourceType, facilityId,
  ).then((tx: { wait(): Promise<TransactionReceipt> }) => tx.wait());
  const parser = new Interface(registryAbi);
  for (const log of receipt.logs) {
    try {
      const parsed = parser.parseLog(log);
      if (parsed?.name === "RecordCreated") return { recordId: parsed.args.recordId.toString(), transactionHash: receipt.hash };
    } catch { /* ignore unrelated logs */ }
  }
  throw new Error("Không thể xác nhận hồ sơ sau giao dịch.");
}

export async function createOnChainRecordVersion(
  previousRecordId: string | number,
  doctorWallet: string,
  cid: string,
  contentHash: string,
) {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error("Hệ thống xác minh chưa được cấu hình.");
  }
  const { signer, address } = await connectWallet();
  if (address.toLowerCase() !== doctorWallet.toLowerCase()) {
    throw new Error("Ví MetaMask hiện tại không khớp ví bác sĩ đã xác minh.");
  }
  const contract = new Contract(contractAddress, registryAbi, signer);
  const hash = contentHash.startsWith("0x") ? contentHash : `0x${contentHash}`;
  const receipt = await contract.createRecordVersion(previousRecordId, cid, hash)
    .then((tx: { wait(): Promise<TransactionReceipt> }) => tx.wait());
  const parser = new Interface(registryAbi);
  for (const log of receipt.logs) {
    try {
      const parsed = parser.parseLog(log);
      if (parsed?.name === "RecordCreated") return { recordId: parsed.args.recordId.toString(), transactionHash: receipt.hash };
    } catch {
      // Ignore logs emitted by other contracts.
    }
  }
  throw new Error("Giao dịch thành công nhưng không thể xác nhận hồ sơ.");
}
