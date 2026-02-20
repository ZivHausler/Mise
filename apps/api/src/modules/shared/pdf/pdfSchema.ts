import { z } from 'zod';

export const pdfQuerySchema = z.object({
  lang: z.enum(['en', 'he']).default('en'),
  dateFormat: z.enum(['dd/mm/yyyy', 'mm/dd/yyyy']).default('dd/mm/yyyy'),
});

export type PdfQueryParams = z.infer<typeof pdfQuerySchema>;
