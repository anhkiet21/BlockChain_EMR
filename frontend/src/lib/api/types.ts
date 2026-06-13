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
  dateOfBirth?: string; gender?: string; facility?: Facility; wallets: string[];
};

export type Facility = { facilityId: string; name: string; address: string; description?: string };

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
  onChainRecordId: string; blockchainTxHash: string; createdAt: string;
};

export type PatientProfile = {
  id: number; userId: number; patientCode: string; email: string; fullName: string; dateOfBirth?: string;
  gender?: string; phone?: string; address?: string; emergencyContactName?: string; emergencyContactPhone?: string; bloodType?: string;
};

export type PatientSummary = {
  id: number; patientCode: string; fullName: string; dateOfBirth?: string; gender?: string;
};

export type AccessHistory = {
  id: number; doctorProfileId: number; doctorCode: string; doctorName: string; granted: boolean;
  transactionHash: string; blockNumber: string; occurredAt: string; verifiedAt: string;
};

export type PreparedAccessTransaction = {
  from: string; to: string; data: string; chainId: string; value: string; doctorProfileId: number; granted: boolean;
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

export type AccessCheck = { patientWallet: string; granteeWallet: string; granted: boolean };

export type TransactionState = {
  transactionHash: string; found: boolean; success: boolean; blockNumber?: string; confirmations?: string;
};

export type OnChainRecord = {
  recordId: string; cid: string; contentHash?: string; patientWallet: string; authorWallet: string;
  createdAt?: string; previousRecordId?: string; exists: boolean;
};
