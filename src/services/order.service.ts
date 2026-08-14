// src/services/order.service.ts
import { prisma } from '../lib/prisma'

interface OrderItemInput {
  variantId: string
  quantityPurchased: number
}

export class OrderService {
  /**
   * Baixa o estoque após confirmação de pagamento
   */
  async updateStockOnPaymentSuccess(items: OrderItemInput[]) {
    await prisma.$transaction(
      items.map((item) =>
        prisma.productVariant.update({
          where: { id: item.variantId }, // ID da variante recebido do pedido
          data: {
            stockQuantity: {
              decrement: item.quantityPurchased, // Quantidade comprada pelo cliente
            },
          },
        })
      )
    )
  }
}