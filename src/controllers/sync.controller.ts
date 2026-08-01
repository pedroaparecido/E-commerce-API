import { FastifyRequest, FastifyReply } from 'fastify'
import { DropshippingService } from '@/services/dropshipping.service'

export class SyncController {
  async importProducts(request: FastifyRequest, reply: FastifyReply) {
    const dropshippingService = new DropshippingService()

    try {
      // Exemplo: Simulando chamada HTTP para a API externa do fornecedor
      // const response = await axios.get('https://api.fornecedor.com/v1/products', {
      //   headers: { Authorization: `Bearer ${process.env.SUPPLIER_API_KEY}` }
      // })
      // const supplierData = response.data

      // Exemplo com dados mockados de fornecedor:
      const mockSupplierData = [
        {
          supplier_id: 'SUPP_ALI_001',
          sku: 'ALI-FONE-BLUETOOTH-X1',
          title: 'Fone de Ouvido Bluetooth TWS Pro',
          description: 'Fone sem fio com cancelamento de ruído ativo e bateria de até 24 horas.',
          cost_price: 45.00, // Custo R$ 45,00
          category_name: 'Eletrônicos',
          category_slug: 'eletronicos',
          images: [
            'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'
          ],
          variants: [
            { sku: 'ALI-FONE-X1-BLK', name: 'Preto', cost_price: 45.00, stock: 150 },
            { sku: 'ALI-FONE-X1-WHT', name: 'Branco', cost_price: 45.00, stock: 80 }
          ],
          attributes: {
            bluetooth: '5.3',
            bateria: '500mAh',
            resistenciaAgua: 'IPX5'
          }
        },
        {
          supplier_id: 'SUPP_ALI_002',
          sku: 'ALI-SMARTWATCH-ULTRA',
          title: 'Smartwatch Esportivo AMOLED',
          description: 'Relógio inteligente com monitoramento cardíaco, GPS integrado e à prova d\'água.',
          cost_price: 120.00, // Custo R$ 120,00
          category_name: 'Acessórios',
          category_slug: 'acessorios',
          images: [
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30'
          ],
          variants: [
            { sku: 'ALI-WATCH-SLV', name: 'Caixa Prata / Pulseira Preta', cost_price: 120.00, stock: 45 }
          ],
          attributes: {
            tela: '1.43 AMOLED',
            bateria: '7 dias de uso'
          }
        }
      ]

      const result = await dropshippingService.syncCatalogFromApi(mockSupplierData)

      return reply.send({
        message: 'Catálogo sincronizado com sucesso!',
        summary: result,
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Falha ao sincronizar catálogo do fornecedor.' })
    }
  }
}