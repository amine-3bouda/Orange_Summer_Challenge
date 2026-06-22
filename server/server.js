import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { connectDB } from './config/db.js'
import authRouter from './routes/auth.js'
import artworksRouter from './routes/artworks.js'
import { initCronJobs } from './cron.js'
import { initSocket } from './socket.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/artworks', artworksRouter)

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

async function startServer() {
  try {
    await connectDB()
    initCronJobs()
    initSocket(io)
    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()