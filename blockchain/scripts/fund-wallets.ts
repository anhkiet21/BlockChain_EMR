/**
 * fund-wallets.ts
 *
 * Nạp ETH từ các tài khoản Hardhat mặc định (đã có sẵn 10,000 ETH mỗi tài khoản)
 * vào các ví MetaMask mà bạn muốn dùng để test.
 *
 * Cách dùng:
 *   npx hardhat run scripts/fund-wallets.ts --network localhost
 *
 * Hoặc dùng lệnh npm đã cấu hình:
 *   npm run fund
 *
 * Chỉnh danh sách WALLETS_TO_FUND bên dưới với địa chỉ ví thực của bạn.
 */

import { ethers } from "hardhat";

// ─────────────────────────────────────────────────────────────────────────────
// 📝 CHỈNH SỬA DANH SÁCH NÀY với địa chỉ ví MetaMask của bạn
// ─────────────────────────────────────────────────────────────────────────────
const WALLETS_TO_FUND: Array<{ label: string; address: string; amountEth: string }> = [
  {
    label: "👨‍⚕️ Bác sĩ (Doctor)",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat Account #0 (mặc định)
    amountEth: "10",
  },
  {
    label: "🧑‍🦱 Bệnh nhân (Patient)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat Account #1 (mặc định)
    amountEth: "10",
  },
  {
    label: "🏥 Cơ sở y tế (Institution)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat Account #2 (mặc định)
    amountEth: "5",
  },
  {
    label: "🔧 Dự phòng / Admin test",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Hardhat Account #3 (mặc định)
    amountEth: "5",
  },
  // ── Thêm ví của bạn vào đây nếu cần ─────────────────────────────────────
  // {
  //   label: "Ví riêng của tôi",
  //   address: "0xYourWalletAddressHere",
  //   amountEth: "10",
  // },
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const signers = await ethers.getSigners();

  // Dùng tài khoản Hardhat cuối (index 19) làm nguồn nạp
  // để tránh ảnh hưởng đến các ví bác sĩ / bệnh nhân đang test
  const funder = signers[19];
  const funderBalance = await ethers.provider.getBalance(funder.address);

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║         💰  Fund Wallets — Blockchain EMR             ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  console.log(`🏦 Nguồn nạp: Hardhat Account #19`);
  console.log(`   Địa chỉ  : ${funder.address}`);
  console.log(`   Số dư     : ${ethers.formatEther(funderBalance)} ETH\n`);
  console.log("─".repeat(60));

  let totalSent = 0n;

  for (const wallet of WALLETS_TO_FUND) {
    const amount = ethers.parseEther(wallet.amountEth);

    // Kiểm tra số dư trước khi gửi
    const beforeBalance = await ethers.provider.getBalance(wallet.address);

    // Nếu ví đã có >= số tiền cần nạp thì bỏ qua
    if (beforeBalance >= amount) {
      console.log(`⏭️  ${wallet.label}`);
      console.log(`   ${wallet.address}`);
      console.log(`   Đã có ${ethers.formatEther(beforeBalance)} ETH — bỏ qua\n`);
      continue;
    }

    try {
      const tx = await funder.sendTransaction({
        to: wallet.address,
        value: amount,
      });
      await tx.wait();

      const afterBalance = await ethers.provider.getBalance(wallet.address);
      totalSent += amount;

      console.log(`✅  ${wallet.label}`);
      console.log(`   Địa chỉ  : ${wallet.address}`);
      console.log(`   Đã nạp   : +${wallet.amountEth} ETH`);
      console.log(`   Số dư mới: ${ethers.formatEther(afterBalance)} ETH`);
      console.log(`   TX Hash  : ${tx.hash}\n`);
    } catch (err) {
      console.error(`❌  Lỗi khi nạp vào ${wallet.label}:`, err);
    }
  }

  console.log("─".repeat(60));
  console.log(`\n📊 Tổng kết:`);
  console.log(`   Tổng ETH đã nạp: ${ethers.formatEther(totalSent)} ETH`);

  // In số dư mới của tất cả ví
  console.log("\n📋 Số dư hiện tại của các ví:");
  for (const wallet of WALLETS_TO_FUND) {
    const bal = await ethers.provider.getBalance(wallet.address);
    console.log(`   ${wallet.label.padEnd(30)} ${ethers.formatEther(bal).padStart(12)} ETH`);
  }

  // In số dư còn lại của funder
  const remainingBalance = await ethers.provider.getBalance(funder.address);
  console.log(`\n🏦 Số dư còn lại của nguồn nạp: ${ethers.formatEther(remainingBalance)} ETH`);
  console.log("\n✨ Hoàn tất nạp token!\n");
}

main().catch((error) => {
  console.error("Script thất bại:", error);
  process.exitCode = 1;
});
