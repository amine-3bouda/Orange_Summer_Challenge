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
    // Join an artwork-specific room for real-time updates
    socket.on('joinRoom', (artworkId) => {
      socket.join(`artwork:${artworkId}`)
    })

    // Leave a room
    socket.on('leaveRoom', (artworkId) => {
      socket.leave(`artwork:${artworkId}`)
    })

    // Place a bid
    socket.on('placeBid', async ({ artworkId, amount }, callback) => {
      try {
        // Must be authenticated
        if (!socket.user) {
          return callback({ error: 'You must be logged in to place a bid.' })
        }

        const artwork = await Artwork.findById(artworkId)

        if (!artwork) {
          return callback({ error: 'Artwork not found.' })
        }

        // Must be active
        if (artwork.status !== 'active') {
          return callback({ error: 'Bidding is only allowed during an active auction.' })
        }

        // Cannot bid on your own artwork
        if (artwork.ownerId.toString() === socket.user._id.toString()) {
          return callback({ error: 'You cannot bid on your own artwork.' })
        }

        const parsedAmount = Number(amount)
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          return callback({ error: 'Bid amount must be a positive number.' })
        }

        // Must be higher than current bid (or starting price if no bids yet)
        const minimumBid = artwork.currentBid ?? artwork.startingPrice
        if (parsedAmount <= minimumBid) {
          return callback({
            error: `Bid must be higher than the current bid of $${minimumBid.toFixed(2)}.`,
          })
        }

        // Verify user has enough coins
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
