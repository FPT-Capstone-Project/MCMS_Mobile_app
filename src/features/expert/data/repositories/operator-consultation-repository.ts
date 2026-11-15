import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import type {
  CreateIssueInput,
  ExpertIssue,
  ExpertConsultation,
} from '../../domain/entities/expert-consultation';
const endpoints = API_ENDPOINTS.EXPERT;
export const operatorConsultationRepository = {
  async listIssues(page = 1, status?: string, sessionId?: number) {
    const response = await axiosClient.get<{
      data: ExpertIssue[];
      pagination: { totalPages: number; total: number };
    }>(endpoints.ISSUES, { params: { page, pageSize: 20, status, sessionId } });
    return response.data;
  },
  async createIssue(input: CreateIssueInput) {
    const response = await axiosClient.post<{ data: ExpertIssue }>(endpoints.ISSUES, input);
    return response.data.data;
  },
  async request(issueId: number | string, question: string) {
    const response = await axiosClient.post<{ data: ExpertConsultation }>(
      endpoints.REQUEST(issueId),
      { question }
    );
    return response.data.data;
  },
  async addMessage(id: number | string, message: string) {
    await axiosClient.post(endpoints.MESSAGES(id), { message });
  },
  async recordTreatment(id: number | string, actionDescription: string, resultDescription: string) {
    await axiosClient.post(endpoints.TREATMENTS(id), { actionDescription, resultDescription });
  },
  async submitForReview(id: number | string) {
    await axiosClient.patch(endpoints.ISSUE_STATUS(id), { status: 'MONITORING' });
  },
};
