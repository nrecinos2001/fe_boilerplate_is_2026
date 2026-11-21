'use client';

import { useState } from 'react';
import { Search, DoorOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Pre = {
  id: string;
  codigo: string;
  nombreVisitante: string;
  documento: string;
  acompanantes: number;
  inicio: string;
  fin: string;
  estado: string;
};

type ManualErrors = {
  nombreVisitante?: string;
  documento?: string;
  unidadCode?: string;
  acompanantes?: string;
  motivo?: string;
};

export default function VisitasPanel() {
  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pre[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Entrada
  const [selectedPre, setSelectedPre] = useState<Pre | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    nombreVisitante: '',
    documento: '',
    acompanantes: 0,
    unidadCode: '',
    motivo: '',
  });
  const [manualErrors, setManualErrors] = useState<ManualErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedPre(null);
    try {
      const res = await fetch(`/api/visitas/buscar?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al buscar');
      }
      const data = await res.json();
      setSearchResults(data);
      setHasSearched(true);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Error desconocido');
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  };

 
  const validateManualForm = (): boolean => {
    const errors: ManualErrors = {};

    // Nombre
    const nombre = manualForm.nombreVisitante.trim();
    if (!nombre) {
      errors.nombreVisitante = 'El nombre es obligatorio.';
    } else if (nombre.length < 3) {
      errors.nombreVisitante = 'El nombre debe tener al menos 3 caracteres.';
    } else if (nombre.length > 100) {
      errors.nombreVisitante = 'El nombre no puede exceder 100 caracteres.';
    }

    // Documento
    const documento = manualForm.documento.trim();
    if (!documento) {
      errors.documento = 'El documento es obligatorio.';
    } else if (documento.length > 20) {
      errors.documento = 'El documento no puede exceder 20 caracteres.';
    }

    // Unidad
    const unidad = manualForm.unidadCode.trim();
    if (!unidad) {
      errors.unidadCode = 'La unidad es obligatoria.';
    } else if (!/^[A-Z]+-(?:[1-9]\d*)$/.test(unidad)) {
      errors.unidadCode = 'Formato inválido. Ejemplo: A-19, B-103.';
    }

    // Acompañantes
    const acomp = Number(manualForm.acompanantes);
    if (!Number.isInteger(acomp) || acomp < 0 || acomp > 5) {
      errors.acompanantes = 'Debe ser un número entero entre 0 y 5.';
    }

    // Motivo
    const motivo = manualForm.motivo.trim();
    if (!motivo) {
      errors.motivo = 'El motivo es obligatorio.';
    } else if (motivo.length < 10) {
      errors.motivo = 'El motivo debe tener al menos 10 caracteres.';
    } else if (motivo.length > 200) {
      errors.motivo = 'El motivo no puede exceder 200 caracteres.';
    }

    setManualErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegistrarEntrada = async () => {
    setSubmitError(null);

    if (!selectedPre) {
      if (!validateManualForm()) {
        return;
      }
    }

    setSubmitting(true);

    const payload = selectedPre
      ? { preautorizacionId: selectedPre.id }
      : {
          nombreVisitante: manualForm.nombreVisitante.trim(),
          documento: manualForm.documento.trim(),
          acompanantes: Number(manualForm.acompanantes),
          unidadCode: manualForm.unidadCode.trim(),
          motivo: manualForm.motivo.trim(),
        };

    try {
      const res = await fetch('/api/visitas/entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Error al registrar entrada');
      }

      // Reset
      setSelectedPre(null);
      setSearchResults([]);
      setSearchQuery('');
      setHasSearched(false);
      setManualMode(false);
      setManualForm({ nombreVisitante: '', documento: '', acompanantes: 0, unidadCode: '', motivo: '' });
      setManualErrors({});
    } catch (e) {
      setSubmitError('Por favor revise la unidad');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0a2f1f] focus:border-transparent outline-none transition ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Seguridad
        </p>
        <h1 className="text-4xl font-serif text-gray-900 mb-2">
          Registro de entrada
        </h1>
        <p className="text-gray-600">
          Busca una pre-autorización por código, documento o nombre, o registra una entrada sin autorización.
        </p>
        <Link
          href="/seguridad/panel"
          className="inline-flex items-center gap-2 mt-4 text-sm text-[#0a2f1f] underline"
        >
          Ver panel de visitantes dentro →
        </Link>
      </div>

      {/* Buscador */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Buscar pre-autorización
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHasSearched(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Código, documento o nombre del visitante"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] disabled:opacity-50"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchError && (
          <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
            {searchError}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">
              {searchResults.length} resultado(s)
            </p>
            {searchResults.map((pre) => (
              <div
                key={pre.id}
                className={`border rounded-lg p-3 cursor-pointer transition ${
                  selectedPre?.id === pre.id
                    ? 'border-[#0a2f1f] bg-[#f0f5f2]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPre(pre)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {pre.nombreVisitante}
                    </p>
                    <p className="text-xs text-gray-500">
                      Doc: {pre.documento} · {pre.acompanantes} acomp.
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(pre.inicio).toLocaleString()} → {new Date(pre.fin).toLocaleString()}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#0a2f1f]">
                    {pre.codigo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasSearched && searchResults.length === 0 && !searching && (
          <p className="mt-4 text-sm text-gray-500">
            No se encontraron pre-autorizaciones vigentes.
          </p>
        )}
      </div>

      {/* Botón para modo manual */}
      {!selectedPre && (
        <div className="text-center mb-6">
          <button
            onClick={() => {
              setManualMode(!manualMode);
              setManualErrors({});
              setSubmitError(null);
            }}
            className="text-sm text-[#0a2f1f] underline"
          >
            {manualMode ? 'Cancelar registro manual' : 'El visitante no tiene autorización'}
          </button>
        </div>
      )}

      {/* Formulario manual (sin pre-autorización) */}
      {manualMode && !selectedPre && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Registrar sin autorización
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre del visitante *
              </label>
              <input
                type="text"
                value={manualForm.nombreVisitante}
                onChange={(e) => setManualForm({ ...manualForm, nombreVisitante: e.target.value })}
                className={inputClass(!!manualErrors.nombreVisitante)}
              />
              {manualErrors.nombreVisitante && (
                <p className="text-red-500 text-xs mt-1">{manualErrors.nombreVisitante}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Documento *
              </label>
              <input
                type="text"
                value={manualForm.documento}
                onChange={(e) => setManualForm({ ...manualForm, documento: e.target.value })}
                className={inputClass(!!manualErrors.documento)}
              />
              {manualErrors.documento && (
                <p className="text-red-500 text-xs mt-1">{manualErrors.documento}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unidad (código) *
              </label>
              <input
                type="text"
                value={manualForm.unidadCode}
                onChange={(e) => setManualForm({ ...manualForm, unidadCode: e.target.value.toUpperCase() })}
                placeholder="Ej. A-19"
                className={inputClass(!!manualErrors.unidadCode)}
              />
              {manualErrors.unidadCode ? (
                <p className="text-red-500 text-xs mt-1">{manualErrors.unidadCode}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplo: A-19, B-103. Debe existir en el condominio.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Acompañantes (0-5)
              </label>
              <input
                type="number"
                min={0}
                max={5}
                value={manualForm.acompanantes}
                onChange={(e) => setManualForm({ ...manualForm, acompanantes: Number(e.target.value) })}
                className={inputClass(!!manualErrors.acompanantes)}
              />
              {manualErrors.acompanantes && (
                <p className="text-red-500 text-xs mt-1">{manualErrors.acompanantes}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Motivo (10-200 caracteres) *
            </label>
            <textarea
              value={manualForm.motivo}
              onChange={(e) => setManualForm({ ...manualForm, motivo: e.target.value })}
              rows={3}
              className={`${inputClass(!!manualErrors.motivo)} resize-none`}
              placeholder="Describe el motivo de la visita sin autorización"
            />
            {manualErrors.motivo && (
              <p className="text-red-500 text-xs mt-1">{manualErrors.motivo}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {manualForm.motivo.length} / 200 caracteres
            </p>
          </div>
        </div>
      )}

      {/* Botón de registrar entrada */}
      {(selectedPre || manualMode) && (
        <div className="flex justify-end">
          <button
            onClick={handleRegistrarEntrada}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a2f1f] text-white rounded-lg text-sm font-medium hover:bg-[#164a33] disabled:opacity-50"
          >
            <DoorOpen size={16} />
            {submitting ? 'Registrando...' : 'Registrar entrada'}
          </button>
        </div>
      )}

      {submitError && (
        <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
          {submitError}
        </div>
      )}
    </div>
  );
}