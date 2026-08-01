import { FastifyInstance } from 'fastify'
import { SyncController } from '@/controllers/sync.controller'

const syncController = new SyncController()

export async function adminRoutes(app: FastifyInstance) {
  // Rota para disparar a sincronização dos produtos
  app.post('/admin/sync/dropshipping', syncController.importProducts)
}