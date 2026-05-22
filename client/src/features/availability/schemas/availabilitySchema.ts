import { z } from 'zod';

export const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format');

export const timeRangeItemSchema = z
  .object({
    start: timeStringSchema,
    end: timeStringSchema,
  })
  .refine(
    (data) => {
      const [startH, startM] = data.start.split(':').map(Number);
      const [endH, endM] = data.end.split(':').map(Number);
      return startH * 60 + startM < endH * 60 + endM;
    },
    { message: 'End time must be after start time' }
  );

export const dayOfWeekSchema = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

export const templateItemSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  start: timeStringSchema,
  end: timeStringSchema,
});

export const upsertTemplateSchema = z.object({
  items: z.array(templateItemSchema),
});

export const upsertOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Empty array = clear all overrides for this day (valid — backend full-replace semantics)
  items: z.array(timeRangeItemSchema),
});
