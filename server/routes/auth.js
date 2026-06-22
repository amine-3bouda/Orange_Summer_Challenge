import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { requireAuth } from '../middleware/requireAuth.js'
import { User } from '../models/User.js'

const router = Router()

function createAuthToken(user) {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

function buildUserResponse(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    coins: user.coins,
  }
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' })
    }

    const normalizedUsername = username.trim()
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    })

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      coins: 100,
    })

    const token = createAuthToken(user)

    res.status(201).json({
      user: buildUserResponse(user),
      token,
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to register user' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = createAuthToken(user)

    res.json({
      user: buildUserResponse(user),
      token,
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to log in' })
  }
})

router.post('/logout', requireAuth, async (req, res) => {
  try {
    req.user.tokenVersion += 1
    await req.user.save()

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to log out' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: buildUserResponse(req.user) })
})

export default router