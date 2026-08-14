import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@/lib/prisma'

export class WebhookController {
  async handleMercadoPagoNotification(request: FastifyRequest, reply: FastifyReply) {
    const { action, data } = request.body as any

    // Exemplo: O Mercado Pago avisa que um pagamento foi atualizado
    if (action === 'payment.updated' || data?.id) {
      const paymentId = data.id

      // 1. Consulta o status do pagamento na API do Mercado Pago
      // const payment = await mercadoPago.payment.get({ id: paymentId })
      const paymentStatus = 'approved' // Supondo retorno 'approved' da API

      if (paymentStatus === 'approved') {
        const orderId = 'ID_DO_PEDIDO_ASSOCIADO' // Obtido do external_reference do Mercado Pago

        // 2. Usa uma Transação Atômica no Prisma ($transaction)
        await prisma.$transaction(async (tx) => {
          // Busca o pedido com os itens gravados
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
          })

          if (!order || order.status === 'PAID') return

          // Atualiza o status do pedido para PAGO
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          })

          // 3. Decrementa o estoque de cada variante comprada no pedido
          for (const item of order.items) {
            await tx.productVariant.update({
              where: { id: item.variantId! },
              data: {
                stockQuantity: {
                  decrement: item.quantity, // Subtrai a quantidade vendida
                },
              },
            })
          }
        })

        console.log(`✅ Estoque atualizado para o pedido ${orderId}`)
      }
    }

    return reply.status(200).send({ received: true })
  }
}