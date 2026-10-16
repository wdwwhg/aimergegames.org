import { z } from 'zod';

export const generationInput = z
  .object({
    gameA: z.string().trim().min(2).max(80),
    gameB: z.string().trim().min(2).max(80),
    description: z.string().trim().max(1200).default(''),
    genre: z.enum(['auto', 'platformer', 'action', 'survival']).default('auto'),
    idempotencyKey: z.string().uuid(),
  })
  .refine((v) => v.gameA.toLowerCase() !== v.gameB.toLowerCase(), {
    message: 'Choose two different games.',
  });
export const gameOutput = z.object({
  title: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(10).max(600),
  controls: z.string().trim().min(5).max(500),
  code: z.string().min(80).max(131072),
});
export type GenerationInput = z.infer<typeof generationInput>;
export type GameOutput = z.infer<typeof gameOutput>;
export type GameArtifact = GameOutput & {
  id: string;
  gameA: string;
  gameB: string;
  genre: string;
  version: number;
  thumbnail: string;
  createdAt: string;
};
export const ACTIVE_STATUSES = [
  'pending',
  'generating',
  'validating',
  'repairing',
] as const;
