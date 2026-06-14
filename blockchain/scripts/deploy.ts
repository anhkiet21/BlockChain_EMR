import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.deployContract("MedicalRecordRegistry");
  await registry.waitForDeployment();
  const defaultDoctorWallet =
    process.env.LOCAL_DOCTOR_WALLET ??
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
  const defaultDoctorFacility =
    process.env.LOCAL_DOCTOR_FACILITY_ID ?? "BV001";
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
  await (await registry.setDoctorFacility(
    defaultDoctorWallet,
    ethers.encodeBytes32String(defaultDoctorFacility),
  )).wait();
  const network = await ethers.provider.getNetwork();
  console.log(JSON.stringify({
    contract: "MedicalRecordRegistry",
    contractAddress: await registry.getAddress(),
    chainId: network.chainId.toString(),
    defaultDoctorWallet,
    defaultDoctorFacility,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
