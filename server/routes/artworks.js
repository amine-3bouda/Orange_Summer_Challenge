import { Router } from 'express'
import mongoose from 'mongoose'

import { Artwork } from '../models/Artwork.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

const allowedTags = ['painting', 'wall art', 'digital', 'sketch']

function normalizeTags(tags) {
  if (tags === undefined) {
    return undefined
  }

  if (!Array.isArray(tags)) {
    return null
  }

  const invalidTags = tags.filter((tag) => !allowedTags.includes(tag))

  if (invalidTags.length > 0) {
    return null
  }

  return tags
}

function getArtworkPayload(body) {
  const tags = normalizeTags(body.tags)
  const title = String(body.title || '').trim()
  const imageURL = String(body.imageURL || '').trim()
  const startingPrice = Number(body.startingPrice)

  if (tags === null) {
    return { error: `Tags must be one or more of: ${allowedTags.join(', ')}` }
  }

  if (!title) {
    return { error: 'Title is required' }
  }

  if (!imageURL) {
    return { error: 'Image URL is required' }
  }

  if (!Number.isFinite(startingPrice) || startingPrice < 0) {
    return { error: 'Starting price must be a valid number greater than or equal to 0' }
  }

  return {
    data: {
      title,
      imageURL,
      tags,
      startingPrice,
    },
  }
}

function isArtworkOwner(artwork, userId) {
  return artwork.ownerId?.toString() === userId.toString()
}

router.get('/', async (req, res) => {
  try {
    const artworks = await Artwork.find().populate('ownerId', 'username email coins').sort({ createdAt: -1 })
    res.json(artworks)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artworks' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artwork id' })
    }

    const artwork = await Artwork.findById(req.params.id).populate('ownerId', 'username email coins')

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' })
    }

    res.json(artwork)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artwork' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const payload = getArtworkPayload(req.body)

    if (payload.error) {
      return res.status(400).json({ message: payload.error })
    }

    const artwork = await Artwork.create({
      ...payload.data,
      ownerId: req.user._id,
    })

    await artwork.populate('ownerId', 'username email coins')

    res.status(201).json(artwork)
  } catch (error) {
    res.status(400).json({
      message: 'Failed to create artwork',
      error: error.message,
    })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artwork id' })
    }

    const payload = getArtworkPayload(req.body)

    if (payload.error) {
      return res.status(400).json({ message: payload.error })
    }

    const artwork = await Artwork.findById(req.params.id)

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' })
    }

    if (!isArtworkOwner(artwork, req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own artwork' })
    }

    artwork.title = payload.data.title
    artwork.imageURL = payload.data.imageURL
    artwork.tags = payload.data.tags ?? artwork.tags
    artwork.startingPrice = payload.data.startingPrice

    await artwork.save()
    await artwork.populate('ownerId', 'username email coins')

    res.json(artwork)
  } catch (error) {
    res.status(400).json({
      message: 'Failed to update artwork',
      error: error.message,
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artwork id' })
    }

    const artwork = await Artwork.findById(req.params.id)

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' })
    }

    if (!isArtworkOwner(artwork, req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own artwork' })
    }

    await artwork.deleteOne()

    res.json({ message: 'Artwork deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete artwork' })
  }
})

export default router