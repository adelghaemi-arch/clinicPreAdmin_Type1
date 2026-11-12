export type Role =
  "management" | "physician" | "reception" | "nursing" | "finance" | "patient";
export type Page =
  | "dashboard"
  | "inbox"
  | "doctors"
  | "appointments"
  | "patients"
  | "finance"
  | "reports"
  | "tariffs"
  | "notifications"
  | "settings"
  | "queue"
  | "visits"
  | "prescriptions"
  | "triage"
  | "procedures"
  | "emergency"
  | "insurance"
  | "history"
  | "payments"
  | "booking";
export type AppointmentStatus =
  | "waitlisted"
  | "scheduled"
  | "waiting"
  | "ready"
  | "visiting"
  | "completed"
  | "cancelled";
export type Theme =
  "winter" | "night" | "corporate" | "emerald" | "nord" | "dim";

export type MaritalStatus = "مجرد" | "متأهل" | "سایر" | "نامشخص";
export type MedicalEventKind =
  "surgery" | "hospitalization" | "episode" | "document";

export interface MedicalEvent {
  id: string;
  patientId: string;
  kind: MedicalEventKind;
  title: string;
  date: string;
  description: string;
  source: "patient" | "clinician";
  createdAt: string;
}

export interface IntakeAnswer {
  value: string;
  /** Free-form multi-line note the patient can add to any item. */
  note?: string;
  skipped?: boolean;
  updatedAt: string;
}

export interface IntakeAttachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Small files are kept as data-URL so the demo stays fully local. */
  dataUrl?: string;
  uploadedAt: string;
}

export interface IntakeAnalysisTopic {
  id: string;
  title: string;
  /** One very short line shown immediately. */
  summary: string;
  /** Longer explanation revealed behind the details toggle. */
  detail: string;
  tone: "info" | "warn" | "good";
}

export interface IntakeAnalysis {
  /** Very concise 1–2 sentence overall summary. */
  summary: string;
  topics: IntakeAnalysisTopic[];
  /** Short safety notes, e.g. allergy or red-flag symptoms. */
  flags: string[];
  answerHash: string;
  updatedAt: string;
}

export interface Intake {
  id: string;
  patientId: string;
  appointmentId: string;
  specialty: string;
  status: "draft" | "submitted";
  answers: Record<string, IntakeAnswer>;
  attachments: IntakeAttachment[];
  analysis?: IntakeAnalysis;
  updatedAt: string;
  submittedAt?: string;
}

export interface Patient {
  id: string;
  name: string;
  nationalCode: string;
  phone: string;
  age: number;
  gender: "زن" | "مرد";
  maritalStatus: MaritalStatus;
  occupation: string;
  smoking: "هرگز" | "ترک کرده" | "گاهی" | "روزانه" | "نامشخص";
  emergencyContact: { name: string; phone: string; relation: string };
  familyHistory: string;
  currentMedications: string;
  conditions: string[];
  insurance: string;
  bloodType: string;
  allergy: string;
  history: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  room: string;
  status: "available" | "visiting" | "off";
  startTime: string;
  endTime: string;
  capacity: number;
  days: string[];
}

export interface Vitals {
  pressure: string;
  pulse: string;
  temperature: string;
  weight: string;
  height: string;
  glucose: string;
  note: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  number: number;
  status: AppointmentStatus;
  total: number;
  patientShare: number;
  paid: boolean;
  paymentMethod?: string;
  receipt?: string;
  vitals?: Vitals;
  diagnosis?: string;
  notes?: string;
  referral?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  date: string;
  diagnosis: string;
  medicine: string;
  directions: string;
  tracking: string;
  referral: string;
}

export interface Procedure {
  id: string;
  patientId: string;
  name: string;
  date: string;
  status: "pending" | "done";
  urgent: boolean;
  note: string;
  total?: number;
  patientShare?: number;
  paid?: boolean;
  paymentMethod?: string;
  receipt?: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  time: string;
  kind: "appointment" | "payment" | "clinical" | "system";
  read: boolean;
}

export interface Tariff {
  id: string;
  name: string;
  specialty: string;
  amount: number;
  insurancePercent: number;
}

export interface Claim {
  id: string;
  insurance: string;
  date: string;
  appointmentIds: string[];
  total: number;
  status: "submitted";
}

export interface ClinicData {
  version: number;
  day: string;
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  procedures: Procedure[];
  activities: Activity[];
  tariffs: Tariff[];
  claims: Claim[];
  medicalEvents: MedicalEvent[];
  intakes: Intake[];
  profile: { name: string; clinicName: string; phone: string };
  cashClosedDate: string | null;
}

export type ModalState =
  | {
      type: "appointment";
      patientId?: string;
      doctorId?: string;
      appointmentId?: string;
    }
  | { type: "patient"; id?: string }
  | { type: "record"; patientId: string }
  | { type: "healthRecord"; patientId: string }
  | { type: "intake"; appointmentId: string }
  | {
      type: "medicalEvent";
      patientId: string;
      eventId?: string;
      kind?: MedicalEventKind;
    }
  | { type: "doctor"; id?: string }
  | { type: "triage"; appointmentId: string }
  | { type: "visit"; appointmentId: string }
  | { type: "pay"; appointmentId: string }
  | { type: "receipt"; appointmentId: string }
  | { type: "service"; urgent?: boolean }
  | { type: "tariff"; id?: string }
  | { type: "monitor" }
  | {
      type: "confirm";
      title: string;
      description: string;
      onConfirm: () => void;
    }
  | null;

export interface Session {
  phone: string;
  role: Role;
  demo: boolean;
  patientId?: string;
}
