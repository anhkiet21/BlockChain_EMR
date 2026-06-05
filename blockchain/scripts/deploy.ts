import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.deployContract("MedicalRecordRegistry");
  await registry.waitForDeployment();
  console.log("MedicalRecordRegistry:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

