// src/app/core/models/candidate.model.ts
export interface CandidateProfile {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  mobile: string;
  dob?: string;
  gender?: string;
  skills: string[];
  experience: number | null;
  resumeUrl: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  currentCompany?: string;
  currentDesignation?: string;
  expectedSalary?: number | null;
  noticePeriodDays?: number | null;
  isOpenToRemote?: boolean;
  preferredLocations: string[];
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  addressId?: string;
  houseNo: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: number | null;
  addressType: string;
}
