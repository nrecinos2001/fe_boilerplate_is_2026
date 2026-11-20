"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleHomePath } from "@/src/lib/role-home";
import { enrollMember } from "@/src/services/members/members-service";
import { useRole } from "@/src/stores/useAuthStore";
import type { EnrolledMember } from "@/src/types/members";
import {
  EMPTY_ENROLLMENT,
  todayIsoDate,
  toEnrollMemberInput,
  validateEnrollment,
  type EnrollMemberErrors,
  type EnrollMemberValues,
} from "./enroll-member-logic";
import { applyEnrollError } from "./enroll-member-errors";
import { EnrollMemberFormView } from "./enroll-member-form-view";
import { credentialsText, EnrollmentResultDialog } from "./enrollment-result-dialog";

export function EnrollMemberForm() {
  const router = useRouter();
  const role = useRole();
  const [values, setValues] = useState<EnrollMemberValues>(EMPTY_ENROLLMENT);
  const [errors, setErrors] = useState<EnrollMemberErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledMember | null>(null);
  const [copied, setCopied] = useState(false);

  function handleChange(field: keyof EnrollMemberValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }

  async function handleSubmit() {
    const found = validateEnrollment(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    const result = await enrollMember(toEnrollMemberInput(values));
    setSubmitting(false);

    if (result.ok) {
      setEnrolled(result.data);
      setCopied(false);
      setValues(EMPTY_ENROLLMENT);
      return;
    }

    // Los datos escritos se conservan para corregir y volver a enviar.
    const placed = applyEnrollError(result);
    setErrors((prev) => ({ ...prev, ...placed.fieldErrors }));
    setServerError(placed.message);
  }

  async function handleCopy() {
    if (!enrolled) return;
    try {
      await navigator.clipboard.writeText(credentialsText(enrolled));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <EnrollMemberFormView
        values={values}
        errors={errors}
        submitting={submitting}
        serverError={serverError}
        maxBirthDate={todayIsoDate()}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={() => router.push(roleHomePath(role))}
      />
      {enrolled && (
        <EnrollmentResultDialog
          member={enrolled}
          copied={copied}
          onCopy={handleCopy}
          onClose={() => setEnrolled(null)}
        />
      )}
    </>
  );
}
