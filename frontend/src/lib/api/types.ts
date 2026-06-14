export type Page<T> = {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean;
};

export type Department = {
  id: number; code: string; name: string; description?: string; active: boolean;
};

export type DoctorProfile = {
  id: number; userId: number; doctorCode: string; email?: string; identityNumberMasked?: string; fullName: string; licenseNumber: string;
  specialization?: string; department?: Department; phone?: string; biography?: string; verified: boolean;
  verificationStatus: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  rejectionReason?: string; reviewedAt?: string; reviewedByAdminUserId?: number;
  dateOfBirth?: string; gender?: string; facility?: Facility; wallets: string[]; accountStatus: "ACTIVE" | "LOCKED";
};

export type Facility = { facilityId: string; name: string; address: string; description?: string };

export type AdminPatient = {
  id: number; userId: number; patientCode: string; fullName: string; identityNumberMasked?: string;
  phone?: string; walletLinked: boolean; accountStatus: "ACTIVE" | "LOCKED";
};

export type AdminFacility = {
  facilityId: string; name: string; address: string; active: boolean;
};

export type FacilityConsistency = {
  facilityId: string; name: string; databaseActive: boolean; blockchainActive: boolean | null;
  synchronizedState: boolean; status: "SYNCHRONIZED" | "MISMATCH" | "BLOCKCHAIN_UNAVAILABLE";
};

export type AdminAccessAudit = {
  id: number; action: "GRANT_ACCESS" | "REVOKE_ACCESS"; actorName: string; actorWallet: string;
  facilityId: string; facilityName: string; transactionHash: string; occurredAt: string;
};

export type SystemAuditEvent = {
  id: number; action: string; actorUserId: number; actorName: string; actorRole: string;
  targetType: string; targetId: string; targetName?: string; reason?: string;
  previousState?: string; newState?: string; transactionHash?: string; occurredAt: string;
};

export type FacilityGrant = {
  facilityId: string; facilityName: string; active: boolean; blockchainTxHash: string; updatedAt: string;
};

export type FacilityAccessRequest = {
  requestId: number; facilityId: string; facilityName: string; doctorName: string; reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED"; blockchainTxHash?: string;
  createdAt: string; respondedAt?: string;
};

export type PreparedFacilityTransaction = {
  from: string; to: string; data: string; chainId: string; value: string; facilityId: string; granted: boolean;
};

export type PendingRecordUpload = {
  medicalFileId: number; cid: string; contentHash: string; sourceType: "PATIENT_UPLOADED" | "DOCTOR_UPLOADED";
  patientWallet: string; uploaderWallet: string; facilityId?: string;
};

export type UnifiedMedicalRecord = {
  recordId: number; patientProfileId: number; medicalFileId: number; originalFileName: string; mimeType: string;
  fileSize: number; cid: string; contentHash: string; sourceType: "PATIENT_UPLOADED" | "DOCTOR_UPLOADED";
  uploaderName: string; uploadedByWallet: string; facilityId?: string; facilityName?: string;
  onChainRecordId: string; blockchainTxHash: string; status: "ACTIVE" | "CORRECTED" | "CANCELLED";
  previousRecordId?: number; successorRecordId?: number; correctionReason?: string; correctedAt?: string;
  createdAt: string;
};

export type RecordAuditLog = {
  id: number; recordId?: number; medicalFileId?: number; medicalFileName?: string; action: string;
  actorName: string; actorRoles: string[]; facilityId?: string; facilityName?: string;
  emergencyAccessId?: number;
  emergencyCaseCode?: string;
  emergencyReason?: string;
  emergencyDoctorName?: string;
  emergencyFacilityId?: string;
  emergencyFacilityName?: string;
  emergencyStartedAt?: string;
  emergencyExpiresAt?: string;
  emergencyActiveAtActionTime?: boolean;
  createdAt: string;
};

export type RecordIntegrity = {
  recordId: number;
  medicalFileId: number;
  valid: boolean;
  status: "VALID" | "TAMPERED" | "ON_CHAIN_UNREADABLE";
  message: string;
  storageReadable: boolean;
  blockchainReadable: boolean;
  cidMatches: boolean;
  databaseHashMatchesOnChain: boolean;
  computedHashMatchesOnChain: boolean;
  databaseCid: string;
  onChainCid?: string;
  databaseHash: string;
  onChainHash?: string;
  computedHash?: string;
  checkedAt: string;
};

export type PatientProfile = {
  id: number; userId: number; patientCode: string; email: string; fullName: string; dateOfBirth?: string;
  gender?: string; phone?: string; address?: string; emergencyContactName?: string; emergencyContactPhone?: string; bloodType?: string;
};

export type PatientSummary = {
  id: number; patientCode: string; fullName: string; dateOfBirth?: string; gender?: string;
};

export type EmergencyAccessLog = {
  id: number;
  patientProfileId: number;
  patientCode: string;
  patientName: string;
  facilityId: string;
  facilityName: string;
  doctorName: string;
  caseCode: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  endedAt?: string;
  endedByName?: string;
  endReason?: string;
  active: boolean;
};

export type UploadedFile = { fileId: number; cid: string; contentHash: string };

export type MedicalFile = {
  id: number; originalFilename: string; contentType: string; originalSize: number; storageProvider: string; createdAt: string;
};

export type MedicalRecord = {
  id: number; patientProfileId: number; authorDoctorProfileId: number; title: string; recordType: string;
  onChainRecordId: string; status: "ACTIVE" | "CORRECTED" | "CANCELLED"; previousRecordId?: number;
  successorRecordId?: number; correctionReason?: string; correctedAt?: string; createdAt: string; files: MedicalFile[];
};

export type FacilityAccessCheck = { patientWallet: string; facilityId: string; granted: boolean };

export type TransactionState = {
  transactionHash: string; status: "PENDING" | "SUCCESS" | "FAILED"; blockNumber?: string; failureReason?: string;
};

export type OnChainRecord = {
  recordId: string; cid: string; contentHash?: string; patientWallet: string; authorWallet: string;
  createdAt?: string; previousRecordId?: string; exists: boolean;
};
