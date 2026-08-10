// backend/src/server.ts
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyCsrf from '@fastify/csrf-protection'
import { paymentRoutes } from './routes/payment.routes'
import { adminRoutes } from './routes/admin.routes'
import { productRoutes } from './routes/product.routes'

const app = Fastify({ logger: true })

app.register(cors, { 
  origin: true,
  credentials: true // ⚠️ Importante para envio de cookies entre origens
})

// 1. Registra o gerenciador de cookies (necessário para o CSRF)
app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || "sua-chave-secreta-muito-longa-aqui",
})

// 2. Registra o plugin de proteção CSRF
app.register(fastifyCsrf, {
  cookieKey: "_csrf",
  cookieOpts: { 
    signed: true, 
    path: "/", 
    sameSite: "lax", 
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" // 👈 Ativa HTTPS em produção
  },
})

// Registrar rotas da API
app.register(adminRoutes)
app.register(productRoutes)
app.register(paymentRoutes) // 👈 2. Rota registrada no Fastify


app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('🚀 HTTP Server Running on http://localhost:3333')
})