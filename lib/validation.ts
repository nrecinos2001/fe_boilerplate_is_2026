import { z } from 'zod';

export const reportSchema = z.object({
  title: z.string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(100, 'El título no puede exceder los 100 caracteres'),
  description: z.string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(500, 'La descripción no puede exceder los 500 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría'),
  location: z.string().min(1, 'Indica la ubicación del problema'),
  photos: z.array(z.any())
    .max(3, 'Puedes subir un máximo de 3 fotos')
    .refine((files) => files.every(file => file.size <= 5000000), 'Cada foto debe pesar máximo 5MB')
    .refine(
      (files) => files.every(file => ['image/jpeg', 'image/png'].includes(file.type)),
      'Solo se permiten archivos JPG o PNG'
    )
});