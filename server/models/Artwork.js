import mongoose from 'mongoose'

const artworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  imageURL: {
    type: String,
    required: true,
    trim: true,
  },
  tags: {
    type: [
      {
        type: String,
        enum: ['painting', 'wall art', 'digital', 'sketch'],
      },
    ],
    default: [],
  },
  startingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  ownerId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
})

export const Artwork = mongoose.model('Artwork', artworkSchema)