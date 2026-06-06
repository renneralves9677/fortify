import { describe, it, expect, beforeEach } from 'vitest';
import { TemplatesService } from './templates.service.js';
import { AppError } from '../../core/errors/AppError.js';
import type { TemplatesRepository } from './templates.repository.js';

class FakeTemplatesRepository implements Partial<TemplatesRepository> {
  findByIdForCompany() {
    return Promise.resolve(null);
  }
}

describe('TemplatesService', () => {
  let service: TemplatesService;

  beforeEach(() => {
    service = new TemplatesService(new FakeTemplatesRepository() as TemplatesRepository);
  });

  it('throws when template not found', async () => {
    await expect(service.getTemplateById('missing', 'co-1')).rejects.toMatchObject({
      code: 'TEMPLATE_NOT_FOUND',
    });
  });

  it('throws when default preset key is invalid', async () => {
    expect(() => service.getDefaultPreset('invalid-key')).toThrow(
      expect.objectContaining({ code: 'PRESET_NOT_FOUND' }),
    );
  });

  it('returns default catalog entries', () => {
    const catalog = service.listDefaultCatalog();
    expect(catalog.length).toBeGreaterThan(0);
  });
});
