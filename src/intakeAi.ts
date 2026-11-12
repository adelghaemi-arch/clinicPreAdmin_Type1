import { buildIntakeAnalysis, type IntakeQuestion } from "./intake";
import type { Doctor, IntakeAnalysis, IntakeAttachment, Patient } from "./types";

export interface AnalysisInput {
  specialty: string;
  patient: { age: number; gender: string };
  questions: { id: string; label: string; section: string }[];
  answers: Record<string, { value: string; note: string; skipped: boolean }>;
  attachmentCount: number;
}

export function analysisInput(
  patient: Patient,
  doctor: Doctor | undefined,
  questions: IntakeQuestion[],
  answers: Record<string, { value?: string; note?: string; skipped?: boolean }>,
  attachments: IntakeAttachment[],
): AnalysisInput {
  return {
    specialty: doctor?.specialty || "عمومی",
    // Identifiers, phone numbers and names are not needed by the model.
    patient: { age: patient.age, gender: patient.gender },
    questions: questions.map(({ id, label, section }) => ({ id, label, section })),
    answers: Object.fromEntries(
      questions.map((question) => [
        question.id,
        {
          value: answers[question.id]?.value || "",
          note: answers[question.id]?.note || "",
          skipped: Boolean(answers[question.id]?.skipped),
        },
      ]),
    ),
    attachmentCount: attachments.length,
  };
}

async function request(url: string, init: RequestInit, timeout: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(abort, timeout);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`http-${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function checkAiConnection(signal?: AbortSignal): Promise<boolean> {
  try {
    const result = await request("/api/health", { cache: "no-store" }, 2500, signal);
    return result?.configured === true;
  } catch {
    return false;
  }
}

const tones = new Set(["info", "warn", "good"]);
function validRemote(result: unknown, input: AnalysisInput): result is Pick<IntakeAnalysis, "summary" | "topics" | "flags"> & { model?: string } {
  if (!result || typeof result !== "object") return false;
  const value = result as Record<string, unknown>;
  if (typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > 240) return false;
  if (!Array.isArray(value.topics) || value.topics.length > 40 || !Array.isArray(value.flags) || value.flags.length > 5) return false;
  if (!value.flags.every((flag) => typeof flag === "string" && flag.length <= 220)) return false;
  const ids = new Set([...input.questions.map((question) => question.id), "files"]);
  return value.topics.every((topic) =>
    topic && typeof topic === "object" &&
    typeof topic.id === "string" && ids.has(topic.id) &&
    typeof topic.title === "string" && topic.title.length <= 100 &&
    typeof topic.summary === "string" && topic.summary.length <= 180 &&
    typeof topic.detail === "string" && topic.detail.length <= 6000 &&
    tones.has(topic.tone),
  );
}

export async function createRemoteAnalysis(
  input: AnalysisInput,
  signal?: AbortSignal,
): Promise<Pick<IntakeAnalysis, "summary" | "topics" | "flags" | "engine" | "model">> {
  const result = await request(
    "/api/intake/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    35000,
    signal,
  );
  if (!validRemote(result, input)) throw new Error("invalid-analysis");
  return { summary: result.summary, topics: result.topics, flags: result.flags, engine: "ai", model: result.model };
}

export function createLocalAnalysis(
  patient: Patient,
  doctor: Doctor | undefined,
  questions: IntakeQuestion[],
  answers: Record<string, { value?: string; note?: string; skipped?: boolean }>,
  attachments: IntakeAttachment[],
) {
  return buildIntakeAnalysis(patient, doctor, questions, answers, attachments);
}
