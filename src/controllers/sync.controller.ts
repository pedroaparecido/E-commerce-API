import { FastifyRequest, FastifyReply } from 'fastify'
import { DropshippingService } from '@/services/dropshipping.service'

export interface SyncQuery {
  category?: string
  winning?: string
  massive?: string
  pages?: string
}

export class SyncController {
  async importProducts(request: FastifyRequest, reply: FastifyReply) {
    const dropshippingService = new DropshippingService()
    const { category, winning, massive, pages } = request.query as SyncQuery

    try {
      // 1. Carga Massiva (?massive=true)
      if (massive === 'true') {
        const pagesToFetch = Number(pages) || 2
        const summary = await dropshippingService.syncMassiveCatalog(pagesToFetch)

        return reply.send({
          message: 'Carga massiva de produtos concluída com sucesso!',
          summary,
        })
      }

      // 2. Produtos Campeões (?winning=true)
      if (winning === 'true') {
        const summary = await dropshippingService.syncWinningProducts()

        return reply.send({
          message: 'Produtos campeões importados com sucesso!',
          summary,
        })
      }

      // 3. Por Categoria Específica (?category=Nome)
      const targetCategory = category || 'Consumer Electronics'
      const summary = await dropshippingService.syncCatalogByCategory(targetCategory)

      return reply.send({
        message: `Catálogo de '${targetCategory}' sincronizado com sucesso!`,
        summary,
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send({
        message: 'Falha ao sincronizar catálogo do fornecedor.',
        details: error.message,
      })
    }
  }
}