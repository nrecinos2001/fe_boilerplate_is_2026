/** Hace que el navegador guarde un archivo recibido del backend (p. ej. un PDF). */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Se libera después del clic: revocarla antes cancelaría la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
