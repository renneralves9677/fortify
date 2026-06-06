import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ObraCostCategory, PurchaseOrderStatus } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

type FakeOrder = {
  id: string;
  companyId: string;
  obraId: string;
  number: string;
  category: ObraCostCategory;
  payerCnpj: string;
  description: string;
  amount: number;
  receivedAmount: number;
  status: PurchaseOrderStatus;
  approvedAt: Date | null;
  approvedById: string | null;
  obra: { id: string; name: string; status: string };
};

class FakePurchaseOrdersRepository {
  orders: FakeOrder[] = [
    {
      id: 'po-1',
      companyId: 'co-1',
      obraId: 'obra-1',
      number: 'OC-00001',
      category: ObraCostCategory.COMPRA_MATERIAL,
      payerCnpj: '12345678000199',
      description: 'Materiais diversos',
      amount: 1000,
      receivedAmount: 0,
      status: PurchaseOrderStatus.EMITIDA,
      approvedAt: null,
      approvedById: null,
      obra: { id: 'obra-1', name: 'Obra', status: 'encerrada' },
    },
  ];

  custos: Array<{
    obraId: string;
    category: ObraCostCategory;
    description: string;
    amount: number;
    purchaseOrderId: string;
  }> = [];

  findObraByIdForCompany(obraId: string, companyId: string) {
    if (obraId !== 'obra-1' || companyId !== 'co-1') return Promise.resolve(null);
    return Promise.resolve({ id: obraId, status: this.orders[0]?.obra.status ?? 'ativa' });
  }

  countByCompany(_companyId: string) {
    return Promise.resolve(this.orders.length);
  }

  create(data: {
    obra: { connect: { id: string } };
    number: string;
    category: ObraCostCategory;
    payerCnpj: string;
    description: string;
    amount: number;
    status: PurchaseOrderStatus;
    approvedAt?: Date;
    approvedById?: string;
  }) {
    const order: FakeOrder = {
      id: `po-${this.orders.length + 1}`,
      companyId: 'co-1',
      obraId: data.obra.connect.id,
      number: data.number,
      category: data.category,
      payerCnpj: data.payerCnpj,
      description: data.description,
      amount: data.amount,
      receivedAmount: 0,
      status: data.status,
      approvedAt: data.approvedAt ?? null,
      approvedById: data.approvedById ?? null,
      obra: { id: data.obra.connect.id, name: 'Obra', status: 'ativa' },
    };
    this.orders.push(order);
    return Promise.resolve(order);
  }

  findByIdForCompany(id: string, _companyId: string) {
    return Promise.resolve(this.orders.find((o) => o.id === id) ?? null);
  }

  update(
    id: string,
    data: {
      status?: PurchaseOrderStatus;
      receivedAmount?: number;
      approvedAt?: Date;
      approvedById?: string;
    },
  ) {
    const order = this.orders.find((o) => o.id === id)!;
    Object.assign(order, data);
    return Promise.resolve(order);
  }

  receiveWithCusto(
    orderId: string,
    data: {
      receivedAmount: number;
      status: PurchaseOrderStatus;
      custo: {
        obraId: string;
        category: ObraCostCategory;
        description: string;
        amount: number;
        purchaseOrderId: string;
      };
    },
  ) {
    const order = this.orders.find((o) => o.id === orderId)!;
    order.receivedAmount = data.receivedAmount;
    order.status = data.status;
    this.custos.push(data.custo);
    return Promise.resolve({ order, custoId: `custo-${this.custos.length}` });
  }
}

describe('PurchaseOrdersService', () => {
  let repo: FakePurchaseOrdersRepository;
  let service: PurchaseOrdersService;

  beforeEach(() => {
    repo = new FakePurchaseOrdersRepository();
    service = new PurchaseOrdersService(repo as never);
    process.env.PO_APPROVAL_THRESHOLD = '5000';
  });

  afterEach(() => {
    delete process.env.PO_APPROVAL_THRESHOLD;
  });

  describe('readonly obra', () => {
    it('blocks approve on closed obra', async () => {
      await expect(
        service.approveOrder('po-1', 'co-1', 'admin-1', 'ADMIN'),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('blocks receive on closed obra', async () => {
      repo.orders[0].status = PurchaseOrderStatus.APROVADA;
      repo.orders[0].obra.status = 'encerrada';
      await expect(
        service.receiveOrder('po-1', 'co-1', 'admin-1', 'ADMIN', { amount: 100 }),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('approval threshold', () => {
    beforeEach(() => {
      repo.orders[0].obra.status = 'ativa';
    });

    it('creates order below threshold as APROVADA', async () => {
      const order = await service.createOrder('co-1', 'admin-1', {
        obraId: 'obra-1',
        category: ObraCostCategory.COMPRA_MATERIAL,
        payerCnpj: '12345678000199',
        description: 'Cimento e areia',
        amount: 4999,
      });
      expect(order.status).toBe(PurchaseOrderStatus.APROVADA);
      expect(order.approvedAt).toBeTruthy();
      expect(order.requiresApproval).toBe(false);
    });

    it('creates order at or above threshold as EMITIDA', async () => {
      const order = await service.createOrder('co-1', 'admin-1', {
        obraId: 'obra-1',
        category: ObraCostCategory.EQUIPAMENTO,
        payerCnpj: '12345678000199',
        description: 'Betoneira industrial',
        amount: 5000,
      });
      expect(order.status).toBe(PurchaseOrderStatus.EMITIDA);
      expect(order.requiresApproval).toBe(true);
    });
  });

  describe('approve and receive', () => {
    beforeEach(() => {
      repo.orders = [
        {
          id: 'po-2',
          companyId: 'co-1',
          obraId: 'obra-1',
          number: 'OC-00002',
          category: ObraCostCategory.CONTRATACAO_SERVICO,
          payerCnpj: '12345678000199',
          description: 'Serviço de pintura',
          amount: 8000,
          receivedAmount: 0,
          status: PurchaseOrderStatus.EMITIDA,
          approvedAt: null,
          approvedById: null,
          obra: { id: 'obra-1', name: 'Obra', status: 'ativa' },
        },
      ];
    });

    it('rejects approve for OPERATOR role', async () => {
      await expect(
        service.approveOrder('po-2', 'co-1', 'op-1', 'OPERATOR'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('receive creates linked custo', async () => {
      await service.approveOrder('po-2', 'co-1', 'admin-1', 'ADMIN');

      const { order: updated } = await service.receiveOrder('po-2', 'co-1', 'admin-1', 'ADMIN', {
        amount: 8000,
      });

      expect(updated.status).toBe(PurchaseOrderStatus.RECEBIDA);
      expect(repo.custos).toHaveLength(1);
      expect(repo.custos[0]).toMatchObject({
        obraId: 'obra-1',
        category: ObraCostCategory.CONTRATACAO_SERVICO,
        amount: 8000,
        purchaseOrderId: 'po-2',
        description: 'OC-00002 — Serviço de pintura',
      });
    });

    it('rejects receive for OPERATOR role', async () => {
      repo.orders[0].status = PurchaseOrderStatus.APROVADA;
      await expect(
        service.receiveOrder('po-2', 'co-1', 'op-1', 'OPERATOR', { amount: 100 }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });
});
