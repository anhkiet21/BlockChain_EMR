export type Page<T> = {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean;
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
  onChainRecordId: string; createdAt: string; files: MedicalFile[];
};
