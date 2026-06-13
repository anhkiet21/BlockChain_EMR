import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.deployContract("MedicalRecordRegistry");
  await registry.waitForDeployment();
  const facilityIds = [
    "BV001",
    ...Array.from({ length: 21 }, (_, index) =>
      `BV${String(index + 3).padStart(3, "0")}`,
    ),
  ];
  for (const facilityId of facilityIds) {
    const encoded = ethers.encodeBytes32String(facilityId);
    await (await registry.setFacilityStatus(encoded, true)).wait();
  }
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
