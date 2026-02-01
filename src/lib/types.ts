export interface Config {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  REDIRECT_URI: string;
  SCOPES: string;
}

export interface SubmissionData {
  submissionId: number;
  language: string;
  code: string;
  questionId: string;
  problemUrl: string;
  problemTitle: string;
  timestamp: string;
  status: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
}

export interface StorageData {
  githubToken?: string;
  tokenCreatedAt?: number;
  selectedRepo?: string;
  latestSubmission?: SubmissionData;
}
