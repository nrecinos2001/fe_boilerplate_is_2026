'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { publicarComunicadoAction } from '@/app/actions/comunicados';
import { CONDOMINIO } from '@/lib/condominio';

export default function RedactarComunicadoPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Campos principales del comunicado
  const [titulo, setTitulo] = useState('Interrupción de agua por mantenimiento');
  const [cuerpo, setCuerpo] = useState(
    `El viernes 06 de noviembre, de 10:00 a 12:00 h, se suspenderá el suministro de agua en las torres A y B por mantenimiento del equipo de bombeo.\n\nTe pedimos prever el agua que necesites durante ese horario y mantener cerradas las llaves. Avisaremos por la cartelera cuando se restablezca el servicio.\n\nGracias por tu comprensión. Administración de ${CONDOMINIO.nombre}.`
  );
  const [categoria, setCategoria] = useState<'MANTENIMIENTO' | 'SEGURIDAD' | 'ADMINISTRATIVO'>('MANTENIMIENTO');
  const [prioridad, setPrioridad] = useState<'INFORMATIVO' | 'IMPORTANTE' | 'URGENTE'>('URGENTE');
  const [audienciaTipo, setAudienciaTipo] = useState<'TODO_EL_CONDOMINIO' | 'POR_TORRE' | 'POR_SECCION'>('POR_TORRE');
  const [audienciaTarget, setAudienciaTarget] = useState('Torre A');

  // Control de adjuntos y confirmación
  const [archivos, setArchivos] = useState<File[]>([]);
  const [confirmadoUrgente, setConfirmadoUrgente] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manejo de carga de archivos (máximo 2 archivos, máx 5 MB cada uno, formato PDF/JPG/PNG)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);

    if (archivos.length + selected.length > 2) {
      setErrorMsg('No puedes adjuntar más de 2 archivos.');
      return;
    }

    const permitidos = ['application/pdf', 'image/jpeg', 'image/png'];
    for (const f of selected) {
      if (!permitidos.includes(f.type)) {
        setErrorMsg(`El archivo ${f.name} no es válido. Solo se admiten PDF, JPG y PNG.`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setErrorMsg(`El archivo ${f.name} supera el tamaño máximo permitido de 5 MB.`);
        return;
      }
    }

    setErrorMsg(null);
    setArchivos((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validaciones de negocio en cliente
    if (titulo.trim().length < 10 || titulo.trim().length > 120) {
      setErrorMsg('El título debe tener entre 10 y 120 caracteres.');
      return;
    }

    if (cuerpo.trim().length < 30 || cuerpo.trim().length > 2000) {
      setErrorMsg('El contenido debe tener entre 30 y 2000 caracteres.');
      return;
    }

    if (prioridad === 'URGENTE' && !confirmadoUrgente) {
      setErrorMsg('Debes marcar la casilla de confirmación para comunicados urgentes.');
      return;
    }

    const formData = new FormData();
    formData.append('titulo', titulo.trim());
    formData.append('cuerpo', cuerpo.trim());
    formData.append('categoria', categoria);
    formData.append('prioridad', prioridad);
    formData.append('audienciaTipo', audienciaTipo);
    if (audienciaTarget) formData.append('audienciaTarget', audienciaTarget.trim());

    archivos.forEach((file) => {
      formData.append('archivos', file);
    });

    startTransition(async () => {
      const res = await publicarComunicadoAction(formData);
      if (!res.success) {
        setErrorMsg(res.error);
      } else {
        router.push('/cartelera');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra lateral */}
      

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Cabecera superior */}
        

        {/* Área de formulario */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1B4332]">Comunicación con la comunidad</p>
              <h1 className="text-3xl font-serif text-gray-900 mt-1">Redactar comunicado</h1>
              <p className="text-xs text-gray-500 mt-1">Comparte información clara y oportuna con los residentes de {CONDOMINIO.nombre}.</p>
            </div>
            <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-full font-medium">
              Borrador · No publicado
            </span>
          </div>

          {/* Banner de aviso urgente */}
          {prioridad === 'URGENTE' && (
            <div className="bg-[#EEF4F2] border border-[#C6DDD6] rounded-xl p-4 flex gap-3 text-xs text-[#16382C]">
              <span className="text-base">ℹ</span>
              <div>
                <p className="font-semibold">Un comunicado urgente requiere especial atención</p>
                <p className="text-gray-600 mt-0.5">
                  Al publicarlo, los residentes verán este comunicado mediante un modal. Revisa el contenido y confirma la publicación; todavía no se ha enviado ningún aviso.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Formulario (2 columnas) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Contenido del comunicado</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Los campos con * son obligatorios. El condominio se obtiene de tu sesión.</p>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={120}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#1E3E34] outline-none"
                    placeholder="Título del comunicado"
                    required
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">{titulo.length} / 120 caracteres</span>
                </div>

                {/* Contenido */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contenido *</label>
                  <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#1E3E34]">
                    <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex gap-3 text-xs text-gray-600">
                      <span className="font-bold cursor-pointer hover:text-black">B</span>
                      <span className="italic cursor-pointer hover:text-black">I</span>
                      <span className="cursor-pointer hover:text-black">≡</span>
                      <span className="cursor-pointer hover:text-black">🔗</span>
                    </div>
                    <textarea
                      value={cuerpo}
                      onChange={(e) => setCuerpo(e.target.value)}
                      rows={6}
                      maxLength={2000}
                      className="w-full p-3 text-xs outline-none resize-y"
                      placeholder="Redacta el contenido..."
                      required
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">{cuerpo.length} / 2000 caracteres</span>
                </div>

                {/* Categoría y Prioridad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Categoría *</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white outline-none"
                    >
                      <option value="MANTENIMIENTO">Mantenimiento</option>
                      <option value="SEGURIDAD">Seguridad</option>
                      <option value="ADMINISTRATIVO">Administrativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Urgencia / Prioridad *</label>
                    <select
                      value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white outline-none"
                    >
                      <option value="INFORMATIVO">Informativo · Cartelera general</option>
                      <option value="IMPORTANTE">Importante · Notificación destacada</option>
                      <option value="URGENTE">Urgente · Mostrar al residente mediante modal</option>
                    </select>
                  </div>
                </div>

                {/* Audiencia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Audiencia *</label>
                    <select
                      value={audienciaTipo}
                      onChange={(e) => setAudienciaTipo(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white outline-none"
                    >
                      <option value="TODO_EL_CONDOMINIO">Todo el condominio</option>
                      <option value="POR_TORRE">Por torre</option>
                      <option value="POR_SECCION">Por sección</option>
                    </select>
                  </div>

                  {audienciaTipo !== 'TODO_EL_CONDOMINIO' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Identificador {audienciaTipo === 'POR_TORRE' ? 'de Torre' : 'de Sección'} *
                      </label>
                      <input
                        type="text"
                        value={audienciaTarget}
                        onChange={(e) => setAudienciaTarget(e.target.value)}
                        placeholder="Ej. Torre A y B"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Adjuntos */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Fotos y archivos adjuntos</h3>
                  <p className="text-[11px] text-gray-400">Añade material que ayude a comprender el aviso (máx 2 archivos, hasta 5 MB).</p>
                </div>

                <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-gray-400 text-xl">☁</span>
                    <p className="text-xs text-gray-500">Arrastra fotos o archivos aquí</p>
                    <label className="mt-2 cursor-pointer">
                      <span className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-xs font-medium hover:bg-gray-50 shadow-sm">
                        Seleccionar archivos
                      </span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/jpeg,image/png"
                        onChange={handleFileChange}
                        disabled={archivos.length >= 2}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {archivos.length > 0 && (
                  <div className="space-y-2">
                    {archivos.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50/30 text-xs">
                        <div className="flex items-center gap-2">
                          <span>📄</span>
                          <div>
                            <p className="font-medium text-gray-800">{file.name}</p>
                            <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)} KB · Carga completa</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-gray-500 hover:text-red-600 text-xs"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones inferiores */}
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Guardar borrador
                </button>
                <Link
                  href="/cartelera"
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Volver a cartelera
                </Link>
              </div>
            </div>

            {/* Vista previa y Confirmación (1 columna) */}
            <div className="space-y-6">
              {/* Tarjeta de vista previa */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span className="font-medium text-gray-700">Vista previa</span>
                  <span>Contenido preparado · Aún no visible</span>
                </div>

                <div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${
                    prioridad === 'URGENTE' ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {prioridad.charAt(0) + prioridad.slice(1).toLowerCase()}
                  </span>
                </div>

                <h2 className="text-base font-bold text-gray-900 leading-snug">
                  {titulo || 'Sin título'}
                </h2>
                <p className="text-[11px] text-gray-400">Administración de {CONDOMINIO.nombre} · Sin publicar</p>

                <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed pt-2">
                  {cuerpo || 'Escribe el contenido para previsualizarlo aquí.'}
                </div>

                {archivos.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 space-y-1">
                    {archivos.map((file, i) => (
                      <p key={i} className="text-xs text-emerald-800 flex items-center gap-1 truncate font-medium">
                        📎 {file.name}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmación y Envío */}
              <div className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#EDE5D8] space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Confirmar publicación</h4>
                  <p className="text-[10px] text-amber-800 font-medium">Acción pendiente</p>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  El comunicado y su adjunto se harán visibles para {CONDOMINIO.nombre}. Por ser urgente, se mostrará a los residentes mediante un modal.
                </p>

                <p className="text-[11px] text-gray-500">
                  Audiencia: 47 residentes con acceso activo. Este dato pertenece al contexto del condominio, no al formulario.
                </p>

                {prioridad === 'URGENTE' && (
                  <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={confirmadoUrgente}
                      onChange={(e) => setConfirmadoUrgente(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>He revisado el contenido y confirmo su publicación como urgente.</span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isPending || (prioridad === 'URGENTE' && !confirmadoUrgente)}
                  className="w-full py-2.5 px-4 bg-[#1B4332] text-white rounded-lg text-xs font-medium hover:bg-[#143427] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isPending ? 'Publicando...' : 'Publicar comunicado'}
                </button>

                <p className="text-[10px] text-gray-400 text-center">
                  Selecciona la confirmación para habilitar el envío. Durante el envío, el botón permanecerá deshabilitado para evitar duplicados.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}