// backend/src/routes/webhook.routes.ts
import { Router, Request, Response } from "express"
import { MercadoPagoConfig, Payment } from "mercadopago"

const webhookRoutes = Router()

// Inicializa o cliente do Mercado Pago com o Access Token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

webhookRoutes.post("/webhooks/mercadopago", async (req: Request, res: Response) => {

  try {
    // 1. O Mercado Pago envia o ID do pagamento via body ou query string
    const { action, type, data } = req.body
    const paymentId = data?.id || req.query["data.id"] || req.query.id

    // Verifica se a notificação é referente a um pagamento
    if (type === "payment" || action?.includes("payment")) {
      if (paymentId) {
        // 2. Busca o status real do pagamento diretamente na API do Mercado Pago (evita spoofing/fraudes)
        const payment = new Payment(client)
        const paymentData = await payment.get({ id: String(paymentId) })

        const status = paymentData.status // ex: 'approved', 'pending', 'rejected'
        const externalReference = paymentData.external_reference // ID do seu pedido no banco
        const amount = paymentData.transaction_amount

        console.log(`[Webhook MP] Pagamento #${paymentId} Status: ${status}`)

        // 3. Trata o pagamento aprovado
        if (status === "approved") {
          console.log(`✅ Pagamento de R$ ${amount} aprovado para o pedido ${externalReference}`)

          // TODO: Atualizar status do pedido para "PAGO" no banco de dados (Prisma/MongoDB)
          // await updateOrderStatus(externalReference, 'PAID')

          // TODO: Opcional - Emitir evento de WebSocket / Server-Sent Events (SSE) para o frontend
        }
      }
    }

    // 4. Retorna status 200/204 rapidamente para confirmar o recebimento ao Mercado Pago
    return res.status(200).send("OK")
  } catch (error: any) {
    console.error("Erro ao processar Webhook do Mercado Pago:", error)
    // Retorna 200 mesmo em caso de falha interna de log para evitar retentativas infinitas do MP
    return res.status(200).send("Error handled")
  }
})

export { webhookRoutes }