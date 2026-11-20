"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "./icons";
import { SectionLabel, SectionTitle } from "./ui";

const QUESTIONS = [
  {
    question: "¿Necesito experiencia para empezar?",
    answer:
      "No. Todas las clases se adaptan a tu nivel. Antes de empezar, tu coach te conocerá y ajustará los ejercicios para que entrenes con seguridad desde el primer día.",
  },
  {
    question: "¿Cómo funciona la clase de prueba?",
    answer:
      "Reservas tu plaza con el formulario, eliges disciplina y franja, y te confirmamos en menos de 24 h. Es gratis, dura 50 minutos y no te compromete a nada.",
  },
  {
    question: "¿Puedo cambiar de plan o darme de baja?",
    answer:
      "Sí. No hay permanencia: puedes cambiar o cancelar tu plan hasta 7 días antes de la renovación mensual.",
  },
  {
    question: "¿Qué necesito traer para entrenar?",
    answer:
      "Ropa cómoda, calzado deportivo, una toalla y agua. Nosotros ponemos el material, las taquillas y las duchas.",
  },
] as const;

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="preguntas" className="bg-gym-ink">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 py-24 sm:px-8 lg:flex-row lg:gap-[100px] lg:px-16">
        <div className="flex flex-col gap-6 lg:w-[440px] lg:shrink-0">
          <SectionLabel>08 / SIN DUDAS. SIN EXCUSAS.</SectionLabel>
          <SectionTitle>
            ANTES DE
            <br />
            DAR EL PASO.
          </SectionTitle>
          <p className="font-body text-[14px] leading-[1.6] text-gym-muted">
            ¿Te queda alguna pregunta?
            <br />
            Escríbenos a{" "}
            <a href="mailto:hola@gymhub.club" className="hover:text-gym-text">
              hola@gymhub.club
            </a>
          </p>
        </div>

        <ul className="flex-1 border-y border-gym-line">
          {QUESTIONS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            return (
              <li key={item.question} className="border-b border-gym-line last:border-b-0">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left font-body text-[15px] font-medium text-gym-text transition-colors hover:text-gym-lime"
                  >
                    {item.question}
                    {isOpen ? (
                      <MinusIcon className="shrink-0 text-gym-lime" />
                    ) : (
                      <PlusIcon className="shrink-0 text-gym-lime" />
                    )}
                  </button>
                </h3>
                <div id={panelId} hidden={!isOpen} className="pb-6">
                  <p className="font-body text-[14px] leading-[1.65] text-gym-muted">{item.answer}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
