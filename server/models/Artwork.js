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
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'ended'],
    default: 'pending',
  },
  subscribers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
})

export const Artwork = mongoose.model('Artwork', artworkSchema)