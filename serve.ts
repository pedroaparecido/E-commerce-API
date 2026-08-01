import Fastify from 'fastify'
import cors from '@fastify/cors'
import { adminRoutes } from './src/routes/admin.routes'
import { InventoryCronJob } from './src/jobs/sync-inventory.cron'

const app = Fastify({ logger: true })

// 1. Liberar CORS para o frontend React
app.register(cors, {
  origin: '*', // Em produção, altere para a URL do seu frontend React
})

// 2. Rota de teste / healthcheck
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// 3. Registrar rotas da aplicação
app.register(adminRoutes)

// 4. Inicializar tarefas agendadas (Cron)
const inventoryCron = new InventoryCronJob()
inventoryCron.init()

// 5. Subir o servidor HTTP
app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('HTTP Server Running on http://localhost:3333')
})