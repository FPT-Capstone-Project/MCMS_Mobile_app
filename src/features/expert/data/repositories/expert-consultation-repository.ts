import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import {
  ExpertConsultation,
  ExpertConsultationPage,
  ExpertIssue,
  ExpertResponseInput,
} from '../../domain/entities/expert-consultation';

interface PaginationResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class ExpertConsultationRepository {
  async close(id: string | number, diagnosis: string) {
    await axiosClient.patch(`${API_ENDPOINTS.EXPERT.CONSULTATION(id)}/close`, { diagnosis });
  }

  async listConsultations(page = 1, pageSize = 100): Promise<ExpertConsultationPage> {
    const response = await axiosClient.get<{
      data: ExpertConsultation[];
      pagination: PaginationResponse;
    }>(API_ENDPOINTS.EXPERT.CONSULTATIONS, { params: { page, pageSize } });

    return {
      consultations: response.data.data,
      page: response.data.pagination.page,
      pageSize: response.data.pagination.pageSize,
      total: response.data.pagination.total,
      totalPages: response.data.pagination.totalPages,
    };
  }

  async getConsultation(consultationId: number | string): Promise<ExpertConsultation> {
    const response = await axiosClient.get<{ data: ExpertConsultation }>(
      API_ENDPOINTS.EXPERT.CONSULTATION(consultationId)
    );
    return response.data.data;
  }

  async getIssue(issueId: number | string): Promise<ExpertIssue> {
    const response = await axiosClient.get<{ data: ExpertIssue }>(
      API_ENDPOINTS.EXPERT.ISSUE(issueId)
    );
    return response.data.data;
  }

  async assignToSelf(consultationId: number | string): Promise<ExpertConsultation> {
    const response = await axiosClient.patch<{ data: ExpertConsultation }>(
      API_ENDPOINTS.EXPERT.ASSIGN_CONSULTATION(consultationId),
      {}
    );
    return response.data.data;
  }

  async respond(
    consultationId: number | string,
    input: ExpertResponseInput
  ): Promise<ExpertConsultation> {
    const response = await axiosClient.patch<{ data: ExpertConsultation }>(
      API_ENDPOINTS.EXPERT.RESPOND_TO_CONSULTATION(consultationId),
      input
    );
    return response.data.data;
  }

  async resolveIssue(issueId: number | string): Promise<void> {
    await axiosClient.patch(API_ENDPOINTS.EXPERT.RESOLVE_ISSUE(issueId));
  }

  async reviewTreatment(
    treatmentLogId: number | string,
    reviewResult: 'APPROVED' | 'NEEDS_MORE_ACTION',
    reviewComment?: string,
  ): Promise<void> {
    await axiosClient.post(
      API_ENDPOINTS.EXPERT.REVIEW_TREATMENT(treatmentLogId),
      { reviewResult, reviewComment },
    );
  }
}

export const expertConsultationRepository = new ExpertConsultationRepository();
