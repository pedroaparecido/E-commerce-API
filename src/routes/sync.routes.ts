import { FastifyInstance } from 'fastify'
import { SyncController } from '../controllers/sync.controller'

const syncController = new SyncController()

export async function syncRoutes(app: FastifyInstance) {
  // 🔴 INCORRETO: app.post('/import?winning=true', ...)
  // 🟢 CORRETO: Registre apenas o caminho /import
  app.post('/import', (request, reply) => syncController.importProducts(request, reply))
}