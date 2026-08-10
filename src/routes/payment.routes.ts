// backend/src/routes/payment.routes.ts
import { FastifyInstance } from "fastify"
import { MercadoPagoConfig, Payment } from "mercadopago"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

export async function paymentRoutes(app: FastifyInstance) {
  // 1. Rota para o frontend obter o token CSRF válido
  app.get("/csrf-token", async (request, reply) => {
    const token = await reply.generateCsrf()
    return reply.send({ csrfToken: token })
  })

  // 2. Rota de checkout Pix (Protegida contra CSRF)
  app.post(
    "/checkout/pix",
    {
      onRequest: app.csrfProtection, // 👈 Middleware do Fastify que bloqueia requisições sem o token válido
    },
    async (request, reply) => {
      try {
        const { items, totalAmount, email } = request.body as {
          items: any[]
          totalAmount: number
          email?: string
        }

        const payment = new Payment(client)

        const paymentResponse = await payment.create({
          body: {
            transaction_amount: Number(totalAmount),
            description: `Pedido na loja (${items?.length || 0} itens)`,
            payment_method_id: "pix",
            payer: {
              email: email || "cliente@email.com",
              first_name: "Cliente",
            },
            notification_url: process.env.WEBHOOK_URL!,
          },
        })

        const transactionData = paymentResponse.point_of_interaction?.transaction_data

        return reply.status(201).send({
          paymentId: String(paymentResponse.id),
          status: paymentResponse.status,
          qrCode: transactionData?.qr_code,
          qrCodeBase64: transactionData?.qr_code_base64,
          ticketUrl: transactionData?.ticket_url,
        })
      } catch (error: any) {
        request.log.error("Erro ao gerar Pix no Mercado Pago:", error)
        return reply.status(500).send({
          error: "Falha ao processar pagamento via Pix.",
          details: error.message,
        })
      }
    }
  )

  // Rota de consulta do status do Pix (Polling)
  app.get("/checkout/status/:paymentId", async (request, reply) => {
    try {
      const { paymentId } = request.params as { paymentId: string }
      const payment = new Payment(client)

      const paymentData = await payment.get({ id: paymentId })

      return reply.send({
        status: paymentData.status,
      })
    } catch (error: any) {
      request.log.error("Erro ao buscar status do pagamento:", error)
      return reply.status(500).send({ error: "Erro ao consultar status do Pix." })
    }
  })
}