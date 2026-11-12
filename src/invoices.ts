import type { ClinicData } from "./types";

export interface Invoice {
  id: string;
  kind: "visit" | "procedure";
  patientId: string;
  date: string;
  serviceName: string;
  provider: string;
  total: number;
  patientShare: number;
  paid: boolean;
  paymentMethod?: string;
  receipt?: string;
}

export function invoices(data: ClinicData): Invoice[] {
  const visits: Invoice[] = data.appointments
    .filter((item) => !["cancelled", "waitlisted"].includes(item.status))
    .map((item) => {
      const doctor = data.doctors.find((person) => person.id === item.doctorId);
      return {
        ...item,
        kind: "visit",
        serviceName: `ویزیت ${doctor?.specialty || "متخصص"}`,
        provider: doctor?.name || "پزشک معالج",
      };
    });
  const procedures: Invoice[] = data.procedures
    .filter((item) => item.status === "done" && (item.total || 0) > 0)
    .map((item) => ({
      id: item.id,
      kind: "procedure",
      patientId: item.patientId,
      date: item.date,
      serviceName: item.name,
      provider: "واحد خدمات بالینی سرپایی",
      total: item.total || 0,
      patientShare: item.patientShare || 0,
      paid: !!item.paid,
      paymentMethod: item.paymentMethod,
      receipt: item.receipt,
    }));
  return [...visits, ...procedures];
}

export function serviceBilling(
  data: ClinicData,
  patientId: string,
  tariffId: string,
) {
  const tariff = data.tariffs.find((item) => item.id === tariffId);
  const patient = data.patients.find((item) => item.id === patientId);
  const total = tariff?.amount || 85000;
  const covered = tariff?.insurancePercent ?? 70;
  return {
    total,
    patientShare:
      patient?.insurance === "آزاد"
        ? total
        : Math.round((total * (100 - covered)) / 100),
    paid: false,
  };
}
