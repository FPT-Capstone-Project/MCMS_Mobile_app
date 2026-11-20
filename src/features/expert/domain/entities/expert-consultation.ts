export type ExpertConsultationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'ANSWERED'
  | 'CLOSED';

export type CultivationIssueStatus =
  | 'OPEN'
  | 'WAITING_EXPERT'
  | 'IN_PROGRESS'
  | 'WAITING_REVIEW'
  | 'MONITORING'
  | 'RESOLVED';

export interface ConsultationMessage {
  media_url?: string | null;
  message_id: number | string;
  sender_id: number | string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface ConsultationTreatment {
  treatment_log_id: number | string;
  action_description: string;
  result_description?: string | null;
  performed_at: string;
  performed_by_name: string;
  media?: ExpertIssueMedia[];
  reviews?: TreatmentReview[];
}

export interface TreatmentReview {
  review_id: number | string;
  review_result: 'APPROVED' | 'NEEDS_MORE_ACTION' | 'NEEDS_MORE_INFORMATION' | 'RESOLVED';
  review_comment?: string | null;
  reviewed_by_name?: string | null;
  created_at: string;
}

export interface ExpertConsultation {
  consultation_id: number | string;
  issue_id: number | string;
  status: ExpertConsultationStatus;
  expert_id?: number | string | null;
  expert_name?: string | null;
  diagnosis?: string | null;
  solution?: string | null;
  question: string;
  issue_title: string;
  issue_type?: string | null;
  issue_status: CultivationIssueStatus;
  severity?: string | null;
  session_id?: number | string | null;
  reported_by_name?: string | null;
  created_at: string;
  responded_at?: string | null;
  messages?: ConsultationMessage[];
  treatments?: ConsultationTreatment[];
}

export interface ExpertIssueMedia {
  media_id: number | string;
  media_url: string;
  media_type: string;
  caption?: string | null;
  uploaded_at?: string | null;
}

export interface ExpertIssue {
  session_status?: string | null;
  session_start_at?: string | null;
  expected_harvest_date?: string | null;
  growth_condition?: string | null;
  growth_updated_at?: string | null;
  tray_code?: string | null;
  floor_id?: number | string | null;
  tray_condition?: string | null;
  mushroom_condition?: string | null;
  inspection_notes?: string | null;
  inspection_at?: string | null;
  spawn_condition?: string | null;
  environment_snapshot?: {
    capturedAt?: string;
    floorId?: number;
    sensors?: { sensorAddress: number; temperature: number | null; humidity: number | null; isValid: boolean; receivedAt?: string }[];
  } | null;
  latest_consultation_id?: number | string | null;
  inspection_id?: number | null;
  spawn_inspection_id?: number | null;
  issue_id: number | string;
  title: string;
  description?: string | null;
  issue_type: string;
  status: CultivationIssueStatus;
  severity?: string | null;
  session_id?: number | string | null;
  session_tray_id?: number | string | null;
  tray_id?: number | string | null;
  mushroom_name?: string | null;
  reported_by_name?: string | null;
  reported_stage?: string | null;
  assigned_expert_id?: number | string | null;
  responding_expert_id?: number | string | null;
  growth_stage?: string | null;
  growth_progress?: number | string | null;
  spawn_stage?: string | null;
  media: ExpertIssueMedia[];
}

export interface ExpertConsultationPage {
  consultations: ExpertConsultation[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ExpertResponseInput {
  diagnosis: string;
  solution?: string;
  needsMoreInfo: boolean;
}

export interface ExpertRequestContext {
  sessionId: number;
  sessionTrayId?: number;
  inspectionId?: number;
  spawnInspectionId?: number;
  label: string;
}
export interface CreateIssueInput {
  sessionTrayId?: number;
  inspectionId?: number;
  spawnInspectionId?: number;
  title: string;
  description: string;
  issueType: string;
  severity: string;
}
