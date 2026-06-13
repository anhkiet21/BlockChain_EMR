import { ethers } from "hardhat";

async function main() {
  const [patient, doctor] = await ethers.getSigners();
  const registry = await ethers.deployContract("MedicalRecordRegistry");
  await registry.waitForDeployment();
  const facilityId = ethers.encodeBytes32String("BV001");
  await (await registry.setFacilityStatus(facilityId, true)).wait();
  const facilityGrantReceipt = await (await registry.connect(patient).grantFacilityAccess(facilityId)).wait();
  const grantReceipt = await (await registry.connect(patient).grantAccess(doctor.address)).wait();
  const createReceipt = await (await registry.connect(doctor).createRecord(
    patient.address,
    "bafy-backend-smoke-cid",
    ethers.keccak256(ethers.toUtf8Bytes("encrypted-backend-smoke-content")),
  )).wait();
  const metadataReceipt = await (await registry.connect(patient).createRecordWithMetadata(
    patient.address,
    "bafy-backend-smoke-patient-metadata",
    ethers.keccak256(ethers.toUtf8Bytes("encrypted-backend-smoke-patient-metadata")),
    1,
    ethers.ZeroHash,
  )).wait();

  console.log(JSON.stringify({
    contractAddress: await registry.getAddress(),
    patientWallet: patient.address,
    doctorWallet: doctor.address,
    accessTransactionHash: grantReceipt?.hash,
    facilityAccessTransactionHash: facilityGrantReceipt?.hash,
    transactionHash: createReceipt?.hash,
    metadataTransactionHash: metadataReceipt?.hash,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
