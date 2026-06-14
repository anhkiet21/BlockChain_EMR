import { expect } from "chai";
import { ethers } from "hardhat";

describe("MedicalRecordRegistry", function () {
  const cidV1 = "bafy-encrypted-record-v1";
  const cidV2 = "bafy-encrypted-record-v2";
  const hashV1 = ethers.keccak256(ethers.toUtf8Bytes("encrypted-v1"));
  const hashV2 = ethers.keccak256(ethers.toUtf8Bytes("encrypted-v2"));
  const facilityId = ethers.encodeBytes32String("BV001");
  const otherFacilityId = ethers.encodeBytes32String("BV002");

  async function fixture() {
    const [patient, doctor, otherDoctor, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("MedicalRecordRegistry");
    await registry.waitForDeployment();
    await registry.setFacilityStatus(facilityId, true);
    await registry.setFacilityStatus(otherFacilityId, true);
    return { registry, patient, doctor, otherDoctor, stranger };
  }

  it("seeds facilities, doctor facilities, grants and revokes facility access", async function () {
    const { registry, patient, doctor, stranger } = await fixture();
    await expect(registry.connect(stranger).setFacilityStatus(facilityId, true))
      .to.be.revertedWithCustomError(registry, "NotOwner");
    await expect(registry.connect(stranger).setDoctorFacility(doctor.address, facilityId))
      .to.be.revertedWithCustomError(registry, "NotOwner");

    await expect(registry.setDoctorFacility(doctor.address, facilityId))
      .to.emit(registry, "DoctorFacilityChanged").withArgs(doctor.address, facilityId);
    expect(await registry.doctorFacilities(doctor.address)).to.equal(facilityId);

    await expect(registry.connect(patient).grantFacilityAccess(facilityId))
      .to.emit(registry, "FacilityAccessGranted").withArgs(patient.address, facilityId);
    expect(await registry.hasFacilityAccess(patient.address, facilityId)).to.equal(true);
    await expect(registry.connect(patient).revokeFacilityAccess(facilityId))
      .to.emit(registry, "FacilityAccessRevoked").withArgs(patient.address, facilityId);
    expect(await registry.hasFacilityAccess(patient.address, facilityId)).to.equal(false);
    await expect(registry.connect(patient).grantFacilityAccess(ethers.encodeBytes32String("UNKNOWN")))
      .to.be.revertedWithCustomError(registry, "InvalidFacility");
  });

  it("stores patient and doctor record source metadata", async function () {
    const { registry, patient, doctor } = await fixture();
    await registry.setDoctorFacility(doctor.address, facilityId);

    await registry.connect(patient).createRecordWithMetadata(
      patient.address, cidV1, hashV1, 1, ethers.ZeroHash
    );
    const patientMetadata = await registry.connect(patient).getRecordMetadata(0);
    expect(patientMetadata.sourceType).to.equal(1);
    expect(patientMetadata.uploaderWallet).to.equal(patient.address);

    await registry.connect(patient).grantFacilityAccess(facilityId);
    await registry.connect(doctor).createRecordWithMetadata(patient.address, cidV2, hashV2, 2, facilityId);
    const doctorMetadata = await registry.connect(patient).getRecordMetadata(1);
    expect(doctorMetadata.sourceType).to.equal(2);
    expect(doctorMetadata.uploaderWallet).to.equal(doctor.address);
    expect(doctorMetadata.facilityId).to.equal(facilityId);
  });

  it("requires doctor wallet to belong to the granted facility", async function () {
    const { registry, patient, doctor, otherDoctor } = await fixture();
    await registry.connect(patient).grantFacilityAccess(facilityId);

    await expect(registry.connect(doctor).createRecordWithMetadata(
      patient.address, cidV1, hashV1, 2, facilityId
    )).to.be.revertedWithCustomError(registry, "AccessDenied");

    await registry.setDoctorFacility(doctor.address, otherFacilityId);
    await expect(registry.connect(doctor).createRecordWithMetadata(
      patient.address, cidV1, hashV1, 2, facilityId
    )).to.be.revertedWithCustomError(registry, "AccessDenied");

    await registry.setDoctorFacility(doctor.address, facilityId);
    await registry.connect(doctor).createRecordWithMetadata(patient.address, cidV1, hashV1, 2, facilityId);

    await expect(registry.connect(otherDoctor).getRecord(0))
      .to.be.revertedWithCustomError(registry, "AccessDenied");
    await registry.setDoctorFacility(otherDoctor.address, otherFacilityId);
    await expect(registry.connect(otherDoctor).getRecord(0))
      .to.be.revertedWithCustomError(registry, "AccessDenied");
  });

  it("creates patient records containing only encrypted references and integrity hashes", async function () {
    const { registry, patient } = await fixture();

    await expect(registry.connect(patient).createRecordWithMetadata(
      patient.address, cidV1, hashV1, 1, ethers.ZeroHash,
    )).to.emit(registry, "RecordCreated")
      .withArgs(0, patient.address, patient.address, cidV1, hashV1, ethers.MaxUint256);

    const record = await registry.connect(patient).getRecord(0);
    expect(record.cid).to.equal(cidV1);
    expect(record.contentHash).to.equal(hashV1);
    expect(record.patient).to.equal(patient.address);
    expect(record.author).to.equal(patient.address);
    expect(record.previousRecordId).to.equal(ethers.MaxUint256);
  });

  it("creates a facility-authorized correction with doctor metadata", async function () {
    const { registry, patient, doctor } = await fixture();
    await registry.setDoctorFacility(doctor.address, facilityId);
    await registry.connect(patient).createRecordWithMetadata(
      patient.address, cidV1, hashV1, 1, ethers.ZeroHash
    );

    await expect(registry.connect(doctor).createRecordVersionWithMetadata(
      0, cidV2, hashV2, facilityId
    )).to.be.revertedWithCustomError(registry, "AccessDenied");

    await registry.connect(patient).grantFacilityAccess(facilityId);
    await expect(registry.connect(doctor).createRecordVersionWithMetadata(
      0, cidV2, hashV2, facilityId
    )).to.emit(registry, "RecordVersionCreated").withArgs(0, 1);

    const corrected = await registry.connect(patient).getRecord(1);
    const metadata = await registry.connect(patient).getRecordMetadata(1);
    expect(corrected.previousRecordId).to.equal(0);
    expect(metadata.sourceType).to.equal(2);
    expect(metadata.uploaderWallet).to.equal(doctor.address);
    expect(metadata.facilityId).to.equal(facilityId);
    expect(await registry.isLatestVersion(0)).to.equal(false);
    expect(await registry.isLatestVersion(1)).to.equal(true);
    expect(await registry.getSuccessorRecordId(0)).to.deep.equal([true, 1n]);

    await expect(registry.connect(doctor).createRecordVersionWithMetadata(
      0, "bafy-branch", hashV2, facilityId
    )).to.be.revertedWithCustomError(registry, "RecordAlreadySuperseded");
  });

  it("enforces authorization for create, read and version after revocation", async function () {
    const { registry, patient, doctor, stranger } = await fixture();
    await registry.setDoctorFacility(doctor.address, facilityId);
    await registry.connect(patient).grantFacilityAccess(facilityId);
    await registry.connect(doctor).createRecordWithMetadata(patient.address, cidV1, hashV1, 2, facilityId);

    await expect(registry.connect(stranger).getRecord(0)).to.be.revertedWithCustomError(registry, "AccessDenied");
    await expect(registry.connect(stranger).getSuccessorRecordId(0))
      .to.be.revertedWithCustomError(registry, "AccessDenied");
    await expect(registry.connect(stranger).isLatestVersion(0))
      .to.be.revertedWithCustomError(registry, "AccessDenied");

    await registry.connect(patient).revokeFacilityAccess(facilityId);
    await expect(registry.connect(doctor).getRecord(0)).to.be.revertedWithCustomError(registry, "AccessDenied");
    await expect(registry.connect(doctor).createRecordVersionWithMetadata(0, cidV2, hashV2, facilityId))
      .to.be.revertedWithCustomError(registry, "AccessDenied");
  });

  it("rejects missing hashes, invalid CIDs and unknown records", async function () {
    const { registry, patient, doctor } = await fixture();
    await expect(registry.connect(patient).createRecordWithMetadata(ethers.ZeroAddress, cidV1, hashV1, 1, ethers.ZeroHash))
      .to.be.revertedWithCustomError(registry, "AccessDenied");
    await expect(registry.connect(patient).createRecordWithMetadata(patient.address, "", hashV1, 1, ethers.ZeroHash))
      .to.be.revertedWithCustomError(registry, "InvalidCid");
    await expect(registry.connect(patient).createRecordWithMetadata(patient.address, "x".repeat(256), hashV1, 1, ethers.ZeroHash))
      .to.be.revertedWithCustomError(registry, "InvalidCid");
    await expect(registry.connect(patient).createRecordWithMetadata(patient.address, cidV1, ethers.ZeroHash, 1, ethers.ZeroHash))
      .to.be.revertedWithCustomError(registry, "InvalidContentHash");
    await expect(registry.connect(doctor).getRecord(99))
      .to.be.revertedWithCustomError(registry, "RecordNotFound").withArgs(99);
  });
});
