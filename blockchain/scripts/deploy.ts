import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.deployContract("MedicalRecordRegistry");
  await registry.waitForDeployment();
  const network = await ethers.provider.getNetwork();
  console.log(JSON.stringify({
    contract: "MedicalRecordRegistry",
    contractAddress: await registry.getAddress(),
    chainId: network.chainId.toString(),
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
