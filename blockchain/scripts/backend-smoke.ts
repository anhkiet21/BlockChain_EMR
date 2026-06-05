import { ethers } from "hardhat";

async function main() {
  const [patient, doctor] = await ethers.getSigners();
  const registry = await ethers.deployContract("MedicalRecordRegistry");
  await registry.waitForDeployment();
  await (await registry.connect(patient).setAccess(doctor.address, true)).wait();
  const createReceipt = await (await registry.connect(doctor).createRecord(
    patient.address,
    "bafy-backend-smoke-cid",
  )).wait();

  console.log(JSON.stringify({
    contractAddress: await registry.getAddress(),
    patientWallet: patient.address,
    doctorWallet: doctor.address,
    transactionHash: createReceipt?.hash,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
