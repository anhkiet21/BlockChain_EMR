import { expect } from "chai";
import { ethers } from "hardhat";

describe("MedicalRecordRegistry", function () {
  const cidV1 = "bafy-encrypted-record-v1";
  const cidV2 = "bafy-encrypted-record-v2";
  const hashV1 = ethers.keccak256(ethers.toUtf8Bytes("encrypted-v1"));
  const hashV2 = ethers.keccak256(ethers.toUtf8Bytes("encrypted-v2"));

  async function fixture() {
    const [patient, doctor, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("MedicalRecordRegistry");
    await registry.waitForDeployment();
    return { registry, patient, doctor, stranger };
  }

  it("grants and revokes access with explicit events and duplicate protection", async function () {
    const { registry, patient, doctor } = await fixture();

    await expect(registry.connect(patient).grantAccess(doctor.address))
      .to.emit(registry, "AccessGranted").withArgs(patient.address, doctor.address);
    expect(await registry.hasAccess(patient.address, doctor.address)).to.equal(true);
    expect(await registry.hasAccess(patient.address, patient.address)).to.equal(true);
    await expect(registry.connect(patient).grantAccess(doctor.address))
      .to.be.revertedWithCustomError(registry, "AccessAlreadyGranted");

    await expect(registry.connect(patient).revokeAccess(doctor.address))
      .to.emit(registry, "AccessRevoked").withArgs(patient.address, doctor.address);
    expect(await registry.hasAccess(patient.address, doctor.address)).to.equal(false);
    await expect(registry.connect(patient).revokeAccess(doctor.address))
      .to.be.revertedWithCustomError(registry, "AccessAlreadyRevoked");
  });

  it("creates records containing only encrypted references and integrity hashes", async function () {
    const { registry, patient, doctor } = await fixture();
    await registry.connect(patient).grantAccess(doctor.address);

    await expect(registry.connect(doctor).createRecord(patient.address, cidV1, hashV1))
      .to.emit(registry, "RecordCreated")
      .withArgs(0, patient.address, doctor.address, cidV1, hashV1, ethers.MaxUint256);

    const record = await registry.connect(doctor).getRecord(0);
    expect(record.cid).to.equal(cidV1);
    expect(record.contentHash).to.equal(hashV1);
    expect(record.patient).to.equal(patient.address);
    expect(record.author).to.equal(doctor.address);
    expect(record.previousRecordId).to.equal(ethers.MaxUint256);
  });

  it("creates an immutable version chain and rejects branching from an old version", async function () {
    const { registry, patient, doctor } = await fixture();
    await registry.connect(patient).grantAccess(doctor.address);
    await registry.connect(doctor).createRecord(patient.address, cidV1, hashV1);

    await expect(registry.connect(doctor).createRecordVersion(0, cidV2, hashV2))
      .to.emit(registry, "RecordVersionCreated").withArgs(0, 1);
    expect(await registry.isLatestVersion(0)).to.equal(false);
    expect(await registry.isLatestVersion(1)).to.equal(true);
    expect(await registry.getSuccessorRecordId(0)).to.deep.equal([true, 1n]);
    expect((await registry.connect(patient).getRecord(1)).previousRecordId).to.equal(0);

    await expect(registry.connect(doctor).createRecordVersion(0, "bafy-branch", hashV2))
      .to.be.revertedWithCustomError(registry, "RecordAlreadySuperseded").withArgs(0);
  });

  it("enforces authorization for create, read and version after revocation", async function () {
    const { registry, patient, doctor, stranger } = await fixture();
    await expect(registry.connect(stranger).createRecord(patient.address, cidV1, hashV1))
      .to.be.revertedWithCustomError(registry, "AccessDenied");

    await registry.connect(patient).grantAccess(doctor.address);
    await registry.connect(doctor).createRecord(patient.address, cidV1, hashV1);
    await expect(registry.connect(stranger).getRecord(0)).to.be.revertedWithCustomError(registry, "AccessDenied");
    await expect(registry.connect(stranger).getSuccessorRecordId(0))
      .to.be.revertedWithCustomError(registry, "AccessDenied");
    await expect(registry.connect(stranger).isLatestVersion(0))
      .to.be.revertedWithCustomError(registry, "AccessDenied");

    await registry.connect(patient).revokeAccess(doctor.address);
    await expect(registry.connect(doctor).getRecord(0)).to.be.revertedWithCustomError(registry, "AccessDenied");
    await expect(registry.connect(doctor).createRecordVersion(0, cidV2, hashV2))
      .to.be.revertedWithCustomError(registry, "AccessDenied");
  });

  it("rejects zero addresses, missing hashes, invalid CIDs and unknown records", async function () {
    const { registry, patient, doctor } = await fixture();
    await expect(registry.connect(patient).grantAccess(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(registry, "ZeroAddress");
    await expect(registry.connect(patient).createRecord(ethers.ZeroAddress, cidV1, hashV1))
      .to.be.revertedWithCustomError(registry, "ZeroAddress");
    await expect(registry.connect(patient).createRecord(patient.address, "", hashV1))
      .to.be.revertedWithCustomError(registry, "InvalidCid");
    await expect(registry.connect(patient).createRecord(patient.address, "x".repeat(256), hashV1))
      .to.be.revertedWithCustomError(registry, "InvalidCid");
    await expect(registry.connect(patient).createRecord(patient.address, cidV1, ethers.ZeroHash))
      .to.be.revertedWithCustomError(registry, "InvalidContentHash");
    await expect(registry.connect(doctor).getRecord(99))
      .to.be.revertedWithCustomError(registry, "RecordNotFound").withArgs(99);
  });
});
