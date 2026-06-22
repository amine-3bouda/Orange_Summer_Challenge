import jwt from 'jsonwebtoken'

import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const token = authorizationHeader.slice(7)
    const secret = process.env.JWT_SECRET

    if (!secret) {
      throw new Error('JWT_SECRET is not configured')
    }

    const payload = jwt.verify(token, secret)
    const user = await User.findById(payload.userId)

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}