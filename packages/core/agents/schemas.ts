import {z} from 'zod';
export const pitchSchema=z.object({side:z.enum(['BUY','SELL','HOLD']),conviction:z.number().int().min(1).max(10),size_request_usd:z.number().finite().min(0),horizon_hours:z.number().int().min(1).max(168),forecast_price:z.number().finite().positive(),thesis:z.string().min(1).max(400),bark:z.string().min(1).refine(v=>v.trim().split(/\s+/).length<=8,'Eight words maximum')}).strict();
export const bossSchema=z.object({decisions:z.array(z.object({pitch_id:z.number().int().positive(),decision:z.enum(['APPROVE','TRIM','REJECT']),usd:z.number().finite().nonnegative(),reason:z.string().max(200)}).strict()).max(12),floor_note:z.string().refine(v=>v.trim().split(/\s+/).length<=12)}).strict();

