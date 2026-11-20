"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { todayIsoDate } from "@/src/components/members/enroll-member-logic";
import { roleHomePath } from "@/src/lib/role-home";
import { fetchWeeklyClasses } from "@/src/services/classes/classes-service";
import { searchMembers } from "@/src/services/members/members-service";
import { sellDropIn, sellMembership } from "@/src/services/memberships/membership-sales-service";
import { fetchPlans } from "@/src/services/plans/plans-service";
import { useRole } from "@/src/stores/useAuthStore";
import type { GymClass } from "@/src/types/classes";
import type {
  MemberSearchItem,
  PaymentMethod,
  SoldDropIn,
  SoldMembership,
} from "@/src/types/membership-sales";
import type { Plan } from "@/src/types/plans";
import { SaleFormView } from "./sale-form-view";
import {
  declinedMessage,
  dropInClassesToday,
  emptySale,
  EMPTY_CARD,
  isDropInPlan,
  plansForSale,
  SEARCH_DEBOUNCE_MS,
  shouldSearch,
  todayRange,
  toDropInInput,
  toSellInput,
  validateSale,
  type CardField,
  type SaleErrors,
  type SaleValues,
} from "./sale-logic";
import { DropInSummary, SaleSummary } from "./sale-summary";

type Result =
  | { kind: "membership"; sold: SoldMembership; member: MemberSearchItem }
  | { kind: "drop-in"; sold: SoldDropIn; member: MemberSearchItem };

const LOAD_CLASSES_ERROR = "No pudimos cargar las clases de hoy.";

/** Venta de membresías y clases sueltas en recepción (H04 · FE-4.1). */
export function MembershipSale() {
  const router = useRouter();
  const role = useRole();
  const [today] = useState(todayIsoDate);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [classes, setClasses] = useState<GymClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classesKey, setClassesKey] = useState(0);

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<MemberSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [values, setValues] = useState<SaleValues>(() => emptySale(today));
  const [errors, setErrors] = useState<SaleErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const selectedPlan = plans.find((plan) => String(plan.id) === values.planId);
  const dropIn = isDropInPlan(selectedPlan);

  useEffect(() => {
    let cancelled = false;
    fetchPlans(true).then((res) => {
      if (cancelled) return;
      if (res.ok) setPlans(plansForSale(res.data));
      else setPlansError(res.error);
      setPlansLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Clases de hoy con cupo, al elegir Clase suelta (y otra vez tras un 409).
  useEffect(() => {
    if (!dropIn) return;
    let cancelled = false;
    const now = new Date();
    const { from, to } = todayRange(now);
    fetchWeeklyClasses(from, to).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setClasses(dropInClassesToday(res.data, now));
        setClassesError(null);
      } else {
        setClasses([]);
        setClassesError(LOAD_CLASSES_ERROR);
      }
      setClassesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dropIn, classesKey]);

  // Busca 400 ms después de dejar de escribir; con menos de 2 caracteres no busca.
  useEffect(() => {
    if (!shouldSearch(term)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchMembers(term).then((res) => {
        if (cancelled) return;
        setSearching(false);
        if (res.ok) {
          setResults(res.data);
          setSearchError(null);
        } else {
          setResults([]);
          setSearchError(res.error);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  function handleTermChange(next: string) {
    setTerm(next);
    setResults([]);
    setSearchError(null);
    setSearching(false);
  }

  function update(patch: Partial<SaleValues>, cleared: (keyof SaleErrors)[] = []) {
    setValues((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of [...Object.keys(patch), ...cleared]) delete next[key as keyof SaleErrors];
      return next;
    });
    setServerError(null);
  }

  function handlePlanChange(planId: string) {
    const plan = plans.find((p) => String(p.id) === planId);
    if (isDropInPlan(plan)) {
      setClassesLoading(true);
      setClassesError(null);
    }
    update({ planId, classId: "" });
  }

  async function handleSubmit() {
    const found = validateSale(values, selectedPlan, today, new Date());
    setErrors(found);
    if (Object.keys(found).length > 0 || !values.member) return;
    const member = values.member;

    setSubmitting(true);
    setServerError(null);

    if (dropIn) {
      // Una clave por intento: si se reintenta tras un error, es un cobro nuevo.
      const res = await sellDropIn(toDropInInput(values, crypto.randomUUID()));
      setSubmitting(false);
      // Los datos de la tarjeta no se conservan después de intentar el pago.
      setValues((prev) => ({ ...prev, card: EMPTY_CARD }));
      if (res.ok) {
        setResult({ kind: "drop-in", sold: res.data, member });
        return;
      }
      if (res.status === 409) {
        // El cupo cambió: se recargan las clases de hoy.
        setClassesLoading(true);
        setClassesKey((key) => key + 1);
        setValues((prev) => ({ ...prev, classId: "" }));
      }
      const isDecline = res.status === 400 && values.paymentMethod === "CARD";
      setServerError(isDecline ? declinedMessage(res.error) : res.error);
      return;
    }

    const res = await sellMembership(toSellInput(values));
    setSubmitting(false);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    setResult({ kind: "membership", sold: res.data, member });
  }

  function newSale() {
    setResult(null);
    setValues(emptySale(today));
    setErrors({});
    setServerError(null);
    handleTermChange("");
  }

  if (result?.kind === "membership") {
    return <SaleSummary sale={result.sold} member={result.member} onNewSale={newSale} />;
  }
  if (result?.kind === "drop-in") {
    return <DropInSummary sale={result.sold} member={result.member} onNewSale={newSale} />;
  }

  return (
    <SaleFormView
      picker={{
        term,
        results,
        searching,
        searchError,
        onTermChange: handleTermChange,
        onSelect: (member) => update({ member }),
        onClear: () => {
          update({ member: null });
          handleTermChange("");
        },
      }}
      dropIn={{
        classes,
        classesLoading,
        classesError,
        onClassChange: (classId) => update({ classId }),
        onPaymentMethodChange: (paymentMethod: PaymentMethod | "") =>
          update({ paymentMethod }, ["cardNumber", "holderName", "expiry", "cvv"]),
        onCardChange: (field: CardField, value: string) => {
          setValues((prev) => ({ ...prev, card: { ...prev.card, [field]: value } }));
          setErrors((prev) => ({ ...prev, [field]: undefined }));
          setServerError(null);
        },
      }}
      values={values}
      errors={errors}
      plans={plans}
      plansLoading={plansLoading}
      plansError={plansError}
      today={today}
      submitting={submitting}
      serverError={serverError}
      onPlanChange={handlePlanChange}
      onStartDateChange={(startDate) => update({ startDate })}
      onSubmit={handleSubmit}
      onCancel={() => router.push(roleHomePath(role))}
    />
  );
}
