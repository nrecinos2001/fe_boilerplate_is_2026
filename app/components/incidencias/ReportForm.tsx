'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UploadCloud, X, Info, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CONDOMINIO } from '@/lib/condominio';

const reportSchema = z.object({
  title: z.string()
    .min(5, 'El asunto debe tener al menos 5 caracteres')
    .max(100, 'El asunto no puede exceder los 100 caracteres'),
  location: z.string().min(1, 'La ubicación es obligatoria'),
  description: z.string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(500, 'La descripción no puede exceder los 500 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

type PhotoPreview = { file: File; url: string };

type ReportFormProps = {
  userUnit: string | null;
  userEmail: string;
  userUnitLabel?: string | null;
};

const UNIT_REGEX = /^[A-Z]+-(?:[1-9]\d*)$/;

export default function ReportForm({ userUnit, userEmail, userUnitLabel }: ReportFormProps) {
  const router = useRouter();
  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasUnit = !!userUnit && UNIT_REGEX.test(userUnit);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: '',
      location: '',
      description: '',
      category: '',
    },
  });

  useEffect(() => {
    return () => {
      photoPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoError(null);

    if (photoPreviews.length + files.length > 3) {
      setPhotoError('Puedes subir un máximo de 3 fotos.');
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError(`La foto ${file.name} supera los 5 MB.`);
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setPhotoError(`El archivo ${file.name} no es JPG ni PNG.`);
        return;
      }
    }

    const newPreviews: PhotoPreview[] = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    const preview = photoPreviews[index];
    if (preview) URL.revokeObjectURL(preview.url);
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ReportFormValues) => {
    setSubmitError(null);

    if (!hasUnit) {
      setSubmitError('Tu usuario no tiene una unidad asignada. Contacta a la administración.');
      return;
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('location', data.location);
    photoPreviews.forEach(({ file }) => formData.append('photos', file));

    try {
      const res = await fetch('/api/incidencias', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Error ${res.status}`);
      }

      photoPreviews.forEach((p) => URL.revokeObjectURL(p.url));
      router.push('/incidencias');
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-green-800 focus:border-transparent outline-none transition ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Incidencias
          </p>
          <h1 className="text-4xl font-serif text-gray-900 mb-2">
            Nuevo reporte de incidencia
          </h1>
          <p className="text-gray-600">
            Cuéntanos qué sucede. La administración dará seguimiento a tu reporte.
          </p>
        </div>
        <Link
          href="/incidencias"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <ArrowLeft size={16} /> Mis reportes
        </Link>
      </div>

      {!hasUnit && (
        <div className="mb-6 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg p-3 text-sm">
          Tu usuario no tiene una unidad asignada. Contacta a la administración para poder crear reportes.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Describe el problema</h2>
            <p className="text-sm text-gray-500 mb-6">Los campos con * son obligatorios.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
                <input
                  {...register('title')}
                  placeholder="Ej. Luminaria apagada en pasillo"
                  className={inputClass(!!errors.title)}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  {...register('category')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent outline-none transition ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  } ${watch('category') === '' ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  <option value="" disabled hidden>Selecciona una categoría</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Plomería">Plomería</option>
                  <option value="Electricidad">Electricidad</option>
                  <option value="Seguridad">Seguridad</option>
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación del problema *</label>
                <input
                  {...register('location')}
                  placeholder="Ej. Torre A · Piso 3 · Pasillo frente al elevador"
                  className={inputClass(!!errors.location)}
                />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
                <p className="text-xs text-gray-500 mt-1">Indica el área, torre, piso o una referencia para encontrar el problema.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  placeholder="Describe qué ocurre y desde cuándo lo has notado..."
                  className={`${inputClass(!!errors.description)} resize-none`}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                <p className="text-xs text-gray-500 mt-1">Incluye qué ocurre y desde cuándo lo has notado.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Fotos del problema</h2>
              <span className="text-sm text-gray-500">{photoPreviews.length} de 3 fotos</span>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition relative ${
                photoPreviews.length >= 3
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png"
                onChange={handlePhotoUpload}
                disabled={photoPreviews.length >= 3}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="text-gray-400" size={32} />
                <p className="text-sm font-medium text-gray-700">
                  {photoPreviews.length >= 3 ? 'Máximo alcanzado (3 fotos)' : 'Agregar foto o arrastrar aquí'}
                </p>
                <p className="text-xs text-gray-500">Opcional · Hasta 3 fotos · JPG o PNG · Máx. 5 MB por foto</p>
              </div>
            </div>

            {photoError && <p className="text-red-500 text-sm mt-2">{photoError}</p>}

            {photoPreviews.length > 0 && (
              <div className="mt-4 space-y-2">
                {photoPreviews.map((preview, index) => (
                  <div
                    key={`${preview.file.name}-${index}`}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 shrink-0 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.url} alt={preview.file.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{preview.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(preview.file.size / 1024 / 1024).toFixed(1)} MB · Listo para enviar
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="text-gray-400 hover:text-red-500 shrink-0"
                      aria-label={`Quitar ${preview.file.name}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Link
              href="/incidencias"
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !hasUnit}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] transition disabled:opacity-50"
            >
              <Send size={16} /> {isSubmitting ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tu reporte, en buenas manos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Se enviará a la administración de {CONDOMINIO.nombre} con los datos de tu sesión.
            </p>
            <hr className="border-gray-200 mb-4" />
            <div>
              <p className="font-medium text-gray-900 truncate">{userEmail || 'Usuario'}</p>
              <p className="text-sm text-gray-500">
                Residente {hasUnit ? `· Unidad ${userUnitLabel ?? userUnit}` : '· Sin unidad asignada'}
              </p>
              <p className="text-xs text-gray-400 mt-2">Estos datos se agregan automáticamente.</p>
            </div>
            <hr className="border-gray-200 my-4" />
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p>Solo tú y la administración podrán consultar el seguimiento.</p>
            </div>
          </div>

          <div className="bg-[#f5f0e6] rounded-xl p-6">
            <h3 className="text-lg font-serif text-gray-900 mb-4">¿Qué sucede después?</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">1</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Recibe tu folio</p>
                  <p className="text-xs text-gray-600">Al enviar, podrás consultar el reporte en Mis reportes.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">2</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Sigue los avances</p>
                  <p className="text-xs text-gray-600">La administración actualizará el estado y su respuesta.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">3</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Revisa la resolución</p>
                  <p className="text-xs text-gray-600">Confirma si quedó solucionado o rechaza la resolución.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}