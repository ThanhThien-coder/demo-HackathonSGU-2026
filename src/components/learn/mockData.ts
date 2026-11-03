import { LessonContext } from "./types";

export const MOCK_LESSON_DATA: LessonContext = {
  repoName: "shop-vibecode",
  repoBranch: "main",
  filePath: "src/services/order.service.ts",
  scope: "OrderService.processCheckout",
  categoryTag: "Java Backend",
  question: {
    tag: "CÂU HỎI",
    text: "Bằng lời bình dân như chuyện gọi món ở quán ăn, bạn hãy giải thích: Tại sao cách trừ kho lắt nhắt ở dòng 22 lại làm máy chủ bị đơ khi có 100 người cùng mua một lúc?",
    targetLine: 22,
  },
  mockInitialAnswer:
    "Tưởng tượng 1 bàn gọi 10 món. Thay vì ghi hết 10 món vào phiếu rồi đưa đầu bếp làm 1 lần, người bồi bàn lại chạy vào bếp xin 1 đĩa rồi chạy ra, xong lại chạy vào xin đĩa thứ 2. Chạy đi chạy lại 10 lần làm kẹt cứng lối đi trong bếp! 100 người mua thì có 100 bồi bàn chạy 1,000 chuyến làm sập tiệm.",
  maxWords: 300,
};

export const RAW_SNIPPET_CODE = `async processCheckout(dto: CheckoutDto): Promise<OrderResult> {
  const order = await this.orderRepo.create(dto);

  for (const item of dto.items) {
    await this.inventoryRepo.updateStock(item.id, item.qty);
  }

  const payment = await this.paymentGateway.charge(order.id, dto.amount);
  await this.auditLog.record('ORDER_CREATED', order.id);
  return { orderId: order.id, status: 'SUCCESS' };
}`;

export const FULL_FILE_CODE = `import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderRepository } from '../repositories/order.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { PaymentGateway } from '../gateways/payment.gateway';
import { AuditLogService } from './audit-log.service';
import { CheckoutDto, OrderResult } from '../dtos/checkout.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly auditLog: AuditLogService,
  ) {}

  async processCheckout(dto: CheckoutDto): Promise<OrderResult> {
    const order = await this.orderRepo.create(dto);

    for (const item of dto.items) {
      // DÒNG 22: Update tồn kho lặp tuần tự (N+1 bottleneck)
      await this.inventoryRepo.updateStock(item.id, item.qty);
    }

    const payment = await this.paymentGateway.charge(order.id, dto.amount);
    await this.auditLog.record('ORDER_CREATED', order.id);
    return { orderId: order.id, status: 'SUCCESS' };
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    await this.orderRepo.updateStatus(orderId, 'CANCELLED');
    await this.auditLog.record('ORDER_CANCELLED', orderId);
  }
}
`;
