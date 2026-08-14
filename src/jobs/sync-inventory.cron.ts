import cron from 'node-cron'
import { DropshippingService } from '../services/dropshipping.service'

export class InventoryCronJob {
  private dropshippingService: DropshippingService
  private isRunning = false // Trava de segurança para evitar concorrência

  constructor() {
    this.dropshippingService = new DropshippingService()
  }

  public init() {
    // Agendado para rodar diariamente às 03:00 AM no fuso horário da sua escolha
    cron.schedule(
  '0 3 * * *',
  async () => {
    if (this.isRunning) return
    this.isRunning = true

    try {
      console.log('[CRON] 🚀 Sincronizando estoque...')
      // Lógica de sincronização...
    } finally {
      this.isRunning = false
    }
  },
  {
    timezone: 'America/Sao_Paulo', // Mantenha apenas as opções válidas
  }
)

    console.log('[CRON] Rotina de sincronização de estoque agendada para às 03:00 (America/Sao_Paulo).')
  }
}