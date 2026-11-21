'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';

const schema = z.object({
  nombreVisitante: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  documento: z.string().min(1, 'El documento es obligatorio').max(20),
  inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  fin: z.string().min(1, 'La fecha de fin es obligatoria'),
  acompanantes: z
    .string()
    .min(1, 'Indica cuántos acompañantes')
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n <= 5;
    }, { message: 'Debe ser un número entre 0 y 5' }),
  motivo: z.string().max(200).optional(),
}).refine((d) => new Date(d.inicio) >= new Date(), {
  message: 'La fecha de inicio no puede ser anterior a la actual',
  path: ['inicio'],
}).refine((d) => new Date(d.fin) > new Date(d.inicio), {
  message: 'La fecha de fin debe ser posterior al inicio',
  path: ['fin'],
}).refine((d) => {
  const diff = (new Date(d.fin).getTime() - new Date(d.inicio).getTime()) / (1000 * 60 * 60);
  return diff <= 24;
}, {
  message: 'La vigencia no puede superar las 24 horas',
  path: ['fin'],
});

type FormValues = z.infer<typeof schema>;

export default function PreautorizacionForm({
  userUnit,
  userEmail,
}: {
  userUnit: string | null;
  userEmail: string;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreVisitante: '',
      documento: '',
      inicio: '',
      fin: '',
      acompanantes: '0',
      motivo: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      const payload = {
        nombreVisitante: data.nombreVisitante,
        documento: data.documento,
        inicio: data.inicio,
        fin: data.fin,
        acompanantes: Number(data.acompanantes),
        motivo: data.motivo || undefined,
      };

      const res = await fetch('/api/preautorizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al crear la pre-autorización');
      }
      router.push('/visitas');
      router.refresh();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-green-800 focus:border-transparent outline-none transition ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Visitas</p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">Nueva pre-autorización</h1>
          <p className="text-gray-600">Autoriza a tu visitante con un código único.</p>
        </div>
        <Link
          href="/visitas"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> Mis visitas
        </Link>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del visitante *
          </label>
          <input
            {...register('nombreVisitante')}
            placeholder="Ej. Juan Pérez"
            className={inputClass(!!errors.nombreVisitante)}
          />
          {errors.nombreVisitante && (
            <p className="text-red-500 text-xs mt-1">{errors.nombreVisitante.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Documento de identidad *
          </label>
          <input
            {...register('documento')}
            placeholder="Ej. 12345678"
            className={inputClass(!!errors.documento)}
          />
          {errors.documento && (
            <p className="text-red-500 text-xs mt-1">{errors.documento.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inicio *</label>
            <input
              type="datetime-local"
              {...register('inicio')}
              className={inputClass(!!errors.inicio)}
            />
            {errors.inicio && (
              <p className="text-red-500 text-xs mt-1">{errors.inicio.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
            <input
              type="datetime-local"
              {...register('fin')}
              className={inputClass(!!errors.fin)}
            />
            {errors.fin && (
              <p className="text-red-500 text-xs mt-1">{errors.fin.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Acompañantes (0-5)
          </label>
          <input
            type="number"
            min={0}
            max={5}
            {...register('acompanantes')}
            className={inputClass(!!errors.acompanantes)}
          />
          {errors.acompanantes && (
            <p className="text-red-500 text-xs mt-1">{errors.acompanantes.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo (opcional)
          </label>
          <textarea
            {...register('motivo')}
            rows={3}
            className={`${inputClass(!!errors.motivo)} resize-none`}
          />
        </div>

        {submitError && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/visitas" className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#0a2f1f] text-white rounded-lg text-sm disabled:opacity-50"
          >
            <Send size={16} /> {isSubmitting ? 'Guardando...' : 'Crear pre-autorización'}
          </button>
        </div>
      </form>
    </div>
  );
}