import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import type { PrivacyService } from './privacy.service.js';

export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  async me(req: AuthRequest, res: Response): Promise<void> {
    const data = await this.privacyService.getPrivacyMe(req.user!.userId);
    res.json(data);
  }

  async config(_req: AuthRequest, res: Response): Promise<void> {
    res.json(this.privacyService.getPrivacyConfig());
  }

  async exportData(req: AuthRequest, res: Response): Promise<void> {
    const data = await this.privacyService.exportUserData(req.user!.userId, req.companyId!);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=fortify-dados.json');
    res.send(JSON.stringify(data, null, 2));
  }
}
