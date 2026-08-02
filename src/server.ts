import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { adminRoutes } from './routes/admin.routes'
import { productRoutes } from './routes/product.routes' // 👈 Importe a rota
import { InventoryCronJob } from './jobs/sync-inventory.cron'

const app = Fastify({ logger: true })

app.register(cors, { origin: true })

app.get('/health', async () => ({ status: 'ok' }))

// Registrar rotas da API
app.register(adminRoutes)
app.register(productRoutes) // 👈 Registre aqui

const inventoryCron = new InventoryCronJob()
inventoryCron.init()

app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('🚀 HTTP Server Running on http://localhost:3333')
})