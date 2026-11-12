import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Repeat } from "lucide-react";
import { fa } from "../data";
import { useClinic } from "../store";
import { Avatar } from "./ui";

export const demoPatientIds = ["p1", "p2"];

export default function PatientSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { data, patientId, switchPatient, toast } = useClinic();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const me = data.patients.find((item) => item.id === patientId);
  useEffect(() => {
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (!me) return null;
  const profiles = demoPatientIds
    .map((id) => data.patients.find((item) => item.id === id))
    .filter(Boolean);
  return (
    <div
      className={`patient-switcher popover-root ${compact ? "is-compact" : ""}`}
      ref={ref}
    >
      <button
        className="patient-switcher-button"
        aria-expanded={open}
        aria-label="تغییر پرونده بیمار"
        onClick={() => setOpen(!open)}
      >
        <Avatar name={me.name} size="small" index={me.id === "p2" ? 1 : 0} />
        {!compact && (
          <span>
            <b>{me.name}</b>
            <small>
              {fa(me.age)} سال • {me.gender} • {me.maritalStatus}
            </small>
          </span>
        )}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="header-popover patient-switcher-popover">
          <div className="popover-label">
            <Repeat size={13} /> دو پرونده نمونه با اطلاعات متفاوت
          </div>
          {profiles.map((patient) => {
            if (!patient) return null;
            const today = data.appointments.find(
              (item) =>
                item.patientId === patient.id &&
                item.date === data.day &&
                !["cancelled", "completed"].includes(item.status),
            );
            const doctor = data.doctors.find(
              (item) => item.id === today?.doctorId,
            );
            return (
              <button
                key={patient.id}
                className={patient.id === patientId ? "selected" : ""}
                onClick={() => {
                  setOpen(false);
                  if (patient.id !== patientId) {
                    switchPatient(patient.id);
                    toast(`پرونده ${patient.name} باز شد.`);
                  }
                }}
              >
                <Avatar
                  name={patient.name}
                  index={patient.id === "p2" ? 1 : 0}
                />
                <span>
                  <b>{patient.name}</b>
                  <small>
                    {fa(patient.age)} سال • {patient.gender} •{" "}
                    {patient.maritalStatus}
                  </small>
                  <small>
                    {doctor
                      ? `ویزیت امروز: ${doctor.specialty}`
                      : "بدون ویزیت امروز"}
                  </small>
                </span>
                {patient.id === patientId && <Check size={15} />}
              </button>
            );
          })}
          <p>
            جابه‌جایی فقط در نسخه نمایشی فعال است؛ هر پرونده داده‌های خودش را
            نشان می‌دهد.
          </p>
        </div>
      )}
    </div>
  );
}
