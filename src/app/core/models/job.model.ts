export interface Job {

  jobId: string;

  title: string;

  category: string;

  jobType:
    | 'FULL_TIME'
    | 'PART_TIME'
    | 'CONTRACT'
    | 'INTERNSHIP'
    | 'REMOTE';

  location: string;

  salaryMin: number;

  salaryMax: number;

  skills: string[];

  experienceRequired: number;

  description: string;

  postedBy: string;

  companyName: string;

  companyLogo?: string;

  vacancies: number;

  isRemote: boolean;

  expiresAt: string;

  status:
    | 'ACTIVE'
    | 'PAUSED'
    | 'CLOSED'
    | 'DRAFT';

  postedAt: string;

  createdAt?: string;

  updatedAt?: string;

  applicationsCount?: number;

  viewCount?: number;

}

export interface JobSearchFilters {
  title?: string;

  location?: string;

  category?: string;

  type?: string;

  salaryMin?: number;

  salaryMax?: number;

  experienceLevel?: string;
}
