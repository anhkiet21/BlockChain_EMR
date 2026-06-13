// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Immutable registry for encrypted medical-record references and patient-managed access.
/// @dev Never store plaintext medical or personally identifiable data in this contract.
contract MedicalRecordRegistry {
    uint256 public constant MAX_CID_LENGTH = 255;
    uint256 public constant NO_PREVIOUS_RECORD = type(uint256).max;

    enum SourceType {
        UNSPECIFIED,
        PATIENT_UPLOADED,
        DOCTOR_UPLOADED
    }

    struct Record {
        string cid;
        bytes32 contentHash;
        address patient;
        address author;
        uint64 createdAt;
        uint256 previousRecordId;
    }

    struct RecordMetadata {
        SourceType sourceType;
        address uploaderWallet;
        bytes32 facilityId;
    }

    error ZeroAddress();
    error InvalidCid();
    error InvalidContentHash();
    error AccessAlreadyGranted(address patient, address grantee);
    error AccessAlreadyRevoked(address patient, address grantee);
    error AccessDenied(address patient, address caller);
    error RecordNotFound(uint256 recordId);
    error RecordAlreadySuperseded(uint256 recordId);
    error NotOwner();
    error InvalidFacility();
    error InvalidSourceType();

    uint256 public nextRecordId;
    mapping(uint256 => Record) private records;
    mapping(uint256 => uint256) private successorRecordIds;
    mapping(address => mapping(address => bool)) public accessGrants;
    mapping(bytes32 => bool) public activeFacilities;
    mapping(address => mapping(bytes32 => bool)) public facilityAccessGrants;
    mapping(uint256 => RecordMetadata) private recordMetadata;

    address public immutable owner;

    event AccessGranted(address indexed patient, address indexed grantee);
    event AccessRevoked(address indexed patient, address indexed grantee);
    event RecordCreated(
        uint256 indexed recordId,
        address indexed patient,
        address indexed author,
        string cid,
        bytes32 contentHash,
        uint256 previousRecordId
    );
    event RecordVersionCreated(uint256 indexed previousRecordId, uint256 indexed newRecordId);
    event FacilityStatusChanged(bytes32 indexed facilityId, bool active);
    event FacilityAccessGranted(address indexed patient, bytes32 indexed facilityId);
    event FacilityAccessRevoked(address indexed patient, bytes32 indexed facilityId);
    event RecordMetadataCreated(
        uint256 indexed recordId,
        SourceType sourceType,
        address indexed uploaderWallet,
        bytes32 indexed facilityId
    );

    constructor() {
        owner = msg.sender;
    }

    function setFacilityStatus(bytes32 facilityId, bool active) external {
        if (msg.sender != owner) revert NotOwner();
        if (facilityId == bytes32(0)) revert InvalidFacility();
        activeFacilities[facilityId] = active;
        emit FacilityStatusChanged(facilityId, active);
    }

    function grantFacilityAccess(bytes32 facilityId) external {
        if (!activeFacilities[facilityId]) revert InvalidFacility();
        if (facilityAccessGrants[msg.sender][facilityId]) {
            revert AccessAlreadyGranted(msg.sender, address(0));
        }
        facilityAccessGrants[msg.sender][facilityId] = true;
        emit FacilityAccessGranted(msg.sender, facilityId);
    }

    function revokeFacilityAccess(bytes32 facilityId) external {
        if (!facilityAccessGrants[msg.sender][facilityId]) {
            revert AccessAlreadyRevoked(msg.sender, address(0));
        }
        facilityAccessGrants[msg.sender][facilityId] = false;
        emit FacilityAccessRevoked(msg.sender, facilityId);
    }

    function hasFacilityAccess(address patient, bytes32 facilityId) external view returns (bool) {
        return facilityAccessGrants[patient][facilityId];
    }

    function grantAccess(address grantee) external {
        if (grantee == address(0)) revert ZeroAddress();
        if (accessGrants[msg.sender][grantee]) revert AccessAlreadyGranted(msg.sender, grantee);

        accessGrants[msg.sender][grantee] = true;
        emit AccessGranted(msg.sender, grantee);
    }

    function revokeAccess(address grantee) external {
        if (grantee == address(0)) revert ZeroAddress();
        if (!accessGrants[msg.sender][grantee]) revert AccessAlreadyRevoked(msg.sender, grantee);

        accessGrants[msg.sender][grantee] = false;
        emit AccessRevoked(msg.sender, grantee);
    }

    function hasAccess(address patient, address grantee) external view returns (bool) {
        return patient == grantee || accessGrants[patient][grantee];
    }

    function createRecord(address patient, string calldata cid, bytes32 contentHash)
        external
        returns (uint256 recordId)
    {
        _requireAuthorized(patient, msg.sender);
        recordId = _createRecord(patient, cid, contentHash, NO_PREVIOUS_RECORD);
    }

    function createRecordWithMetadata(
        address patient,
        string calldata cid,
        bytes32 contentHash,
        SourceType sourceType,
        bytes32 facilityId
    ) external returns (uint256 recordId) {
        if (sourceType == SourceType.PATIENT_UPLOADED) {
            if (msg.sender != patient || facilityId != bytes32(0)) revert AccessDenied(patient, msg.sender);
        } else if (sourceType == SourceType.DOCTOR_UPLOADED) {
            if (!activeFacilities[facilityId] || !facilityAccessGrants[patient][facilityId]) {
                revert AccessDenied(patient, msg.sender);
            }
        } else {
            revert InvalidSourceType();
        }

        recordId = _createRecord(patient, cid, contentHash, NO_PREVIOUS_RECORD);
        recordMetadata[recordId] = RecordMetadata(sourceType, msg.sender, facilityId);
        emit RecordMetadataCreated(recordId, sourceType, msg.sender, facilityId);
    }

    function getRecordMetadata(uint256 recordId) external view returns (RecordMetadata memory) {
        Record storage record = _existingRecord(recordId);
        if (msg.sender != record.patient && recordMetadata[recordId].sourceType == SourceType.DOCTOR_UPLOADED) {
            bytes32 facilityId = recordMetadata[recordId].facilityId;
            if (!facilityAccessGrants[record.patient][facilityId]) revert AccessDenied(record.patient, msg.sender);
        } else if (msg.sender != record.patient) {
            _requireAuthorized(record.patient, msg.sender);
        }
        return recordMetadata[recordId];
    }

    function createRecordVersion(uint256 previousRecordId, string calldata cid, bytes32 contentHash)
        external
        returns (uint256 recordId)
    {
        Record storage previous = _existingRecord(previousRecordId);
        _requireAuthorized(previous.patient, msg.sender);
        if (successorRecordIds[previousRecordId] != 0) revert RecordAlreadySuperseded(previousRecordId);

        recordId = _createRecord(previous.patient, cid, contentHash, previousRecordId);
        // Store recordId + 1 so record zero can be represented without a sentinel collision.
        successorRecordIds[previousRecordId] = recordId + 1;
        emit RecordVersionCreated(previousRecordId, recordId);
    }

    function createRecordVersionWithMetadata(
        uint256 previousRecordId,
        string calldata cid,
        bytes32 contentHash,
        bytes32 facilityId
    ) external returns (uint256 recordId) {
        Record storage previous = _existingRecord(previousRecordId);
        if (!activeFacilities[facilityId]
            || !facilityAccessGrants[previous.patient][facilityId]) {
            revert AccessDenied(previous.patient, msg.sender);
        }
        if (successorRecordIds[previousRecordId] != 0) {
            revert RecordAlreadySuperseded(previousRecordId);
        }

        recordId = _createRecord(previous.patient, cid, contentHash, previousRecordId);
        recordMetadata[recordId] = RecordMetadata(SourceType.DOCTOR_UPLOADED, msg.sender, facilityId);
        successorRecordIds[previousRecordId] = recordId + 1;
        emit RecordMetadataCreated(recordId, SourceType.DOCTOR_UPLOADED, msg.sender, facilityId);
        emit RecordVersionCreated(previousRecordId, recordId);
    }

    function getRecord(uint256 recordId) external view returns (Record memory) {
        Record storage record = _existingRecord(recordId);
        _requireRecordAuthorized(recordId, record, msg.sender);
        return record;
    }

    function getSuccessorRecordId(uint256 recordId) external view returns (bool superseded, uint256 successorRecordId) {
        Record storage record = _existingRecord(recordId);
        _requireRecordAuthorized(recordId, record, msg.sender);
        uint256 encoded = successorRecordIds[recordId];
        return encoded == 0 ? (false, 0) : (true, encoded - 1);
    }

    function isLatestVersion(uint256 recordId) external view returns (bool) {
        Record storage record = _existingRecord(recordId);
        _requireRecordAuthorized(recordId, record, msg.sender);
        return successorRecordIds[recordId] == 0;
    }

    function _createRecord(address patient, string calldata cid, bytes32 contentHash, uint256 previousRecordId)
        private
        returns (uint256 recordId)
    {
        uint256 cidLength = bytes(cid).length;
        if (cidLength == 0 || cidLength > MAX_CID_LENGTH) revert InvalidCid();
        if (contentHash == bytes32(0)) revert InvalidContentHash();

        recordId = nextRecordId++;
        records[recordId] = Record(cid, contentHash, patient, msg.sender, uint64(block.timestamp), previousRecordId);
        emit RecordCreated(recordId, patient, msg.sender, cid, contentHash, previousRecordId);
    }

    function _existingRecord(uint256 recordId) private view returns (Record storage record) {
        record = records[recordId];
        if (record.patient == address(0)) revert RecordNotFound(recordId);
    }

    function _requireAuthorized(address patient, address caller) private view {
        if (patient == address(0)) revert ZeroAddress();
        if (caller != patient && !accessGrants[patient][caller]) revert AccessDenied(patient, caller);
    }

    function _requireRecordAuthorized(uint256 recordId, Record storage record, address caller) private view {
        if (caller == record.patient || accessGrants[record.patient][caller]) return;
        RecordMetadata storage metadata = recordMetadata[recordId];
        if (metadata.sourceType == SourceType.DOCTOR_UPLOADED
            && facilityAccessGrants[record.patient][metadata.facilityId]) return;
        revert AccessDenied(record.patient, caller);
    }
}
