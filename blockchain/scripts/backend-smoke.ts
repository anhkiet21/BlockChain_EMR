import { ethers } from "hardhat";

async function main() {
  const [patient, doctor] = await ethers.getSigners();
  const registry = await ethers.deployContract("MedicalRecordRegistry");
  await registry.waitForDeployment();
  const grantReceipt = await (await registry.connect(patient).grantAccess(doctor.address)).wait();
  const createReceipt = await (await registry.connect(doctor).createRecord(
    patient.address,
    "bafy-backend-smoke-cid",
    ethers.keccak256(ethers.toUtf8Bytes("encrypted-backend-smoke-content")),
  )).wait();
  await (await registry.connect(patient).createRecordWithMetadata(
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
    transactionHash: createReceipt?.hash,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
