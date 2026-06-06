import type { Response } from 'express';
import { getLegalConfig } from '../../core/config/legal.js';

export class LegalController {
  getVersions(_req: unknown, res: Response): Promise<void> {
    res.json(getLegalConfig());
    return Promise.resolve();
  }
}
