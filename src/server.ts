import 'tsconfig-paths/register'
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyCsrf from '@fastify/csrf-protection'
import { paymentRoutes } from './routes/payment.routes'
import { adminRoutes } from './routes/admin.routes'
import { productRoutes } from './routes/product.routes'
import { syncRoutes } from './routes/sync.routes' // Ajuste o caminho das suas rotas

const app = Fastify({ logger: true })

// Registra as rotas apontando para o prefixo /sync
app.register(syncRoutes, { prefix: '/sync' })

app.register(cors, { 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true // ⚠️ Importante para envio de cookies entre origens
})

// 1. Registra o gerenciador de cookies com um secret
app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'uma-chave-secreta-super-segura-32-chars',
})

// 2. Registra a proteção CSRF
app.register(fastifyCsrf, {
  cookieOpts: {
    signed: true,
    sameSite: 'none', // Necessário pois o Front (Vercel) e Back (Render) estão em domínios diferentes
    secure: true,   // Necessário para HTTPS em produção
  },
})

// Registrar rotas da API
app.register(adminRoutes)
app.register(productRoutes)
app.register(paymentRoutes) // 👈 2. Rota registrada no Fastify


app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('🚀 HTTP Server Running on http://localhost:3333')
})