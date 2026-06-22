import { Router } from 'express'
import mongoose from 'mongoose'

import { Artwork } from '../models/Artwork.js'

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

  if (tags === null) {
    return { error: `Tags must be one or more of: ${allowedTags.join(', ')}` }
  }

  return {
    data: {
      title: body.title,
      imageURL: body.imageURL,
      tags,
      startingPrice: body.startingPrice,
      ownerId: body.ownerId,
    },
  }
}

router.get('/', async (req, res) => {
  try {
    const artworks = await Artwork.find().sort({ createdAt: -1 })
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

    const artwork = await Artwork.findById(req.params.id)

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' })
    }

    res.json(artwork)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artwork' })
  }
})

router.post('/', async (req, res) => {
  try {
    const payload = getArtworkPayload(req.body)

    if (payload.error) {
      return res.status(400).json({ message: payload.error })
    }

    const artwork = await Artwork.create(payload.data)
    res.status(201).json(artwork)
  } catch (error) {
    res.status(400).json({
      message: 'Failed to create artwork',
      error: error.message,
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artwork id' })
    }

    const payload = getArtworkPayload(req.body)

    if (payload.error) {
      return res.status(400).json({ message: payload.error })
    }

    const artwork = await Artwork.findByIdAndUpdate(req.params.id, payload.data, {
      new: true,
      runValidators: true,
    })

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' })
    }

    res.json(artwork)
  } catch (error) {
    res.status(400).json({
      message: 'Failed to update artwork',
      error: error.message,
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid artwork id' })
    }

    const artwork = await Artwork.findByIdAndDelete(req.params.id)

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' })
    }

    res.json({ message: 'Artwork deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete artwork' })
  }
})

export default router