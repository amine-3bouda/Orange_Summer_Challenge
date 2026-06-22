import jwt from 'jsonwebtoken'
import { Artwork } from './models/Artwork.js'
import { User } from './models/User.js'

export function initSocket(io) {
  // Middleware: authenticate socket connection using JWT from handshake
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) {
        socket.user = null
        return next()
      }
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(payload.userId).select('-passwordHash')
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        socket.user = null
        return next()
      }
      socket.user = user
      next()
    } catch {
      socket.user = null
      next()
    }
  })

  io.on('connection', (socket) => {
    socket.on('joinRoom', (artworkId) => {
      socket.join(`artwork:${artworkId}`)
    })

    socket.on('leaveRoom', (artworkId) => {
      socket.leave(`artwork:${artworkId}`)
    })

    socket.on('placeBid', async ({ artworkId, amount }, callback) => {
      try {
        if (!socket.user) {
          return callback({ error: 'You must be logged in to place a bid.' })
        }

        const artwork = await Artwork.findById(artworkId)

        if (!artwork) {
          return callback({ error: 'Artwork not found.' })
        }

        if (artwork.status !== 'active') {
          return callback({ error: 'Bidding is only allowed during an active auction.' })
        }

        if (artwork.ownerId.toString() === socket.user._id.toString()) {
          return callback({ error: 'You cannot bid on your own artwork.' })
        }

        const parsedAmount = Number(amount)
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          return callback({ error: 'Bid amount must be a positive number.' })
        }

        const minimumBid = artwork.currentBid ?? artwork.startingPrice
        if (parsedAmount <= minimumBid) {
          return callback({
            error: `Bid must be higher than the current bid of $${minimumBid.toFixed(2)}.`,
          })
        }

        if (socket.user.coins < parsedAmount) {
          return callback({
            error: `You don't have enough coins. You have ${socket.user.coins} coins but tried to bid $${parsedAmount}.`,
          })
        }

        // Update the artwork
        artwork.currentBid = parsedAmount
        artwork.currentBidder = socket.user._id
        artwork.bids.push({
          userId: socket.user._id,
          username: socket.user.username,
          amount: parsedAmount,
          timestamp: new Date(),
        })
        await artwork.save()

        const bidEvent = {
          artworkId,
          currentBid: parsedAmount,
          currentBidder: {
            _id: socket.user._id,
            username: socket.user.username,
          },
          bid: {
            userId: socket.user._id,
            username: socket.user.username,
            amount: parsedAmount,
            timestamp: new Date(),
          },
        }

        // Broadcast to everyone in the room (including sender)
        io.to(`artwork:${artworkId}`).emit('newBid', bidEvent)

        callback({ success: true })
      } catch (err) {
        console.error('[SOCKET] placeBid error:', err)
        callback({ error: 'An unexpected error occurred.' })
      }
    })
  })
}
