export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: string[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export type RoleName = "Admin" | "Doctor" | "Patient";

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  userId: string;
  fullName: string;
  email: string;
  role: RoleName;
  // Id of the Doctor/Patient profile linked to this user (null for Admins).
  profileId: string | null;
}

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  role: number;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface DoctorDto {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  specialty: string;
  phoneNumber?: string | null;
  isActive?: boolean;
}

export interface PatientDto {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  dateOfBirth: string | null;
  phoneNumber?: string | null;
  diabetesType?: string | null;
  targetGlucoseMin?: number | null;
  targetGlucoseMax?: number | null;
  isActive?: boolean;
}

// ---- Glucose measurements ----
export type MeasurementSource = "Manual" | "ESP32Simulado";
export type AlertStatus = "None" | "Resolved" | "UnderObservation" | "Ignored";

export interface GlucoseMeasurementDto {
  id: string;
  patientId: string;
  valueMgDl: number;
  measuredAt: string;
  source: MeasurementSource;
  notes?: string | null;
  alertStatus: AlertStatus;
}

export interface CreateMeasurementRequest {
  patientId: string;
  valueMgDl: number;
  measuredAt: string;
  source?: MeasurementSource;
  notes?: string;
}

export interface UpdateMeasurementRequest {
  valueMgDl: number;
  measuredAt: string;
  source?: MeasurementSource;
  notes?: string;
}

// ---- Admin: Doctor management ----
export interface CreateDoctorRequest {
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  licenseNumber: string;
  phoneNumber?: string;
}

export interface UpdateDoctorRequest {
  fullName: string;
  specialty: string;
  phoneNumber?: string;
}

// ---- Admin: Patient management ----
export interface CreatePatientRequest {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  diabetesType?: string;
  targetGlucoseMin?: number;
  targetGlucoseMax?: number;
}

export interface UpdatePatientRequest {
  fullName: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  diabetesType?: string;
  targetGlucoseMin?: number;
  targetGlucoseMax?: number;
}

// PatientDto/DoctorDto extended with the isActive flag, which actually lives on the
// User entity (UserDto.isActive) and is merged client-side from GET /api/users
// (Admin-only), since PatientDto/DoctorDto themselves do not expose it.
export interface PatientDetailDto extends PatientDto {
  isActive?: boolean;
}

export interface DoctorDetailDto extends DoctorDto {
  isActive?: boolean;
}

// ---- Associations (Doctor <-> Patient) ----
export interface DoctorPatientAssociationDto {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  assignedAt: string;
  isActive: boolean;
}

export interface CreateAssociationRequest {
  doctorId: string;
  patientIds: string[];
}

// ---- Clinical notes ----
export interface ClinicalNoteDto {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalNoteRequest {
  content: string;
}

export interface UpdateClinicalNoteRequest {
  content: string;
}

// ---- Messaging ----
export type MessageStatus = "Unread" | "Read";

export interface ConversationDto {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  isArchived: boolean;
  unreadCount: number;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
}

export interface CreateConversationRequest {
  doctorId: string;
  patientId: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderUserId: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
}

// ---- AI reports (simulated, rule-based analysis) ----
export type AIReportPeriod = "daily" | "weekly" | "monthly";
export type AIReportType = "Daily" | "Weekly" | "Monthly";

export interface AIReportDto {
  id: string;
  patientId: string;
  type: AIReportType;
  summary: string;
  recommendations: string;
  referenceDate: string;
  createdAt: string;
}

export interface GenerateAIReportRequest {
  patientId: string;
  period: AIReportPeriod;
}

// ---- Appointments (consultas médicas) ----
// O utente só cria pedidos ("Pendente"); só o médico transiciona para Agendada/Recusada.
export type AppointmentStatus = "Pendente" | "Agendada" | "Recusada" | "Realizada" | "Cancelada";

export interface AppointmentDto {
  id: string;
  patientId: string;
  doctorId?: string | null;
  doctorNameFreetext?: string | null;
  scheduledAt: string;
  location?: string | null;
  notes?: string | null;
  status: AppointmentStatus;
}

export interface AppointmentRequestDto extends AppointmentDto {
  patientName: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId?: string | null;
  doctorNameFreetext?: string | null;
  scheduledAt: string;
  location?: string;
  notes?: string;
  status?: AppointmentStatus;
}

export interface UpdateAppointmentRequest {
  doctorId?: string | null;
  doctorNameFreetext?: string | null;
  scheduledAt: string;
  location?: string;
  notes?: string;
  status?: AppointmentStatus;
}

// ---- Medications (medicamentos) ----
export interface MedicationDto {
  id: string;
  patientId: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export interface CreateMedicationRequest {
  patientId: string;
  name: string;
  dosage?: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateMedicationRequest {
  name: string;
  dosage?: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

// ---- Doctor availability (agenda) ----
export interface DoctorAvailabilityDto {
  id: string;
  doctorId: string;
  weekday: number; // 0 = Domingo ... 6 = Sábado
  startTime: string; // "HH:mm:ss"
  endTime: string;
}

export interface CreateDoctorAvailabilityRequest {
  weekday: number;
  startTime: string;
  endTime: string;
}

// ---- Activity logs (audit, Admin) ----
export interface ActivityLogDto {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string | null;
  createdAt: string;
}
