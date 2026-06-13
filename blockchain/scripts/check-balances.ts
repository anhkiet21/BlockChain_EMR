/**
 * check-balances.ts
 *
 * Kiểm tra số dư ETH của tất cả 20 tài khoản Hardhat mặc định.
 * Dùng để biết địa chỉ ví nào còn nhiều ETH để nạp cho ví test.
 *
 * Cách dùng:
 *   npx hardhat run scripts/check-balances.ts --network localhost
 *   hoặc: npm run balances
 */

import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();

  console.log("\n╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║        💳  Hardhat Accounts & Balances — Blockchain EMR          ║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝\n");
  console.log("⚠️  Dùng private key của các account này để IMPORT vào MetaMask.\n");
  console.log("─".repeat(70));
  console.log(`${"#".padStart(3)}  ${"Địa chỉ ví".padEnd(44)}  ${"Số dư (ETH)".padStart(16)}`);
  console.log("─".repeat(70));

  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const balance = await ethers.provider.getBalance(signer.address);
    const balanceEth = parseFloat(ethers.formatEther(balance)).toFixed(4);

    let role = "";
    if (i === 0) role = " ← 👨‍⚕️ Bác sĩ";
    else if (i === 1) role = " ← 🧑‍🦱 Bệnh nhân";
    else if (i === 2) role = " ← 🏥 Cơ sở y tế";
    else if (i === 3) role = " ← 🔧 Dự phòng";
    else if (i === 19) role = " ← 💰 Nguồn nạp tiền";

    const lowBalance = parseFloat(balanceEth) < 1;
    const balanceStr = lowBalance ? `⚠️  ${balanceEth}` : balanceEth.padStart(12);
    console.log(`${String(i).padStart(3)}  ${signer.address}  ${balanceStr}${role}`);
  }

  console.log("─".repeat(70));
  console.log("\n💡 Ghi chú:");
  console.log("   - Account #0–#19 đều có sẵn 10,000 ETH khi Hardhat khởi động.");
  console.log("   - Import bằng private key từ lệnh: npx hardhat node");
  console.log("   - Nếu muốn nạp cho ví MetaMask riêng, chạy: npm run fund");
  console.log("   - Nếu số dư < 1 ETH, chạy: npm run fund để nạp thêm.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
