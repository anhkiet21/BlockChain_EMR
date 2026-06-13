export type Page<T> = {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean;
};

export type Department = {
  id: number; code: string; name: string; description?: string; active: boolean;
};

export type DoctorProfile = {
  id: number; userId: number; doctorCode: string; email: string; fullName: string; licenseNumber: string;
  specialization: string; department?: Department; institutionId?: number; institutionName?: string;
  institutionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null; phone?: string; biography?: string; verified: boolean;
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

// Access Requests
export interface AccessRequest {
  id: number;
  patientProfileId: number;
  patientName: string;
  doctorProfileId: number;
  doctorCode: string;
  doctorName: string;
  doctorWallet?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  transactionHash?: string;
  rejectedReason?: string;
  respondedAt?: string;
  createdAt: string;
}

// Emergency Access
export interface EmergencyAccess {
  id: number;
  patientProfileId: number;
  patientName: string;
  doctorProfileId: number;
  doctorName: string;
  patientWallet: string;
  doctorWallet: string;
  reason: string;
  transactionHash?: string;
  expiresAt: string;
  createdAt: string;
  active: boolean;
}

// Record Access Log (lịch sử truy cập bệnh án)
export interface RecordAccessLog {
  id: number;
  medicalRecordId?: number;
  medicalRecordTitle?: string;
  actorFullName: string;
  action: 'UPLOAD' | 'CREATE' | 'EDIT' | 'VIEW' | 'DOWNLOAD' | 'CORRECT';
  createdAt: string;
}

// Institution
export interface InstitutionProfile {
  id: number;
  institutionCode: string;
  institutionName: string;
  licenseNumber: string;
  address?: string;
  phone?: string;
  website?: string;
  active: boolean;
  createdAt: string;
}

export interface DoctorAssociation {
  doctorId: number;
  doctorCode: string;
  fullName: string;
  specialization: string;
  licenseNumber: string;
  institutionStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  createdAt: string;
}
