import { expect } from "chai";
import { ethers } from "hardhat";

describe("MedicalRecordRegistry", function () {
  it("allows an authorized doctor to create and read a record", async function () {
    const [patient, doctor] = await ethers.getSigners();
    const registry = await ethers.deployContract("MedicalRecordRegistry");

    await registry.connect(patient).setAccess(doctor.address, true);
    await registry.connect(doctor).createRecord(patient.address, "bafy-test-cid");

    const record = await registry.connect(doctor).getRecord(0);
    expect(record.cid).to.equal("bafy-test-cid");
  });
});

