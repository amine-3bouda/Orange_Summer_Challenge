import mongoose from 'mongoose'

export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI

  if (!mongoURI) {
    throw new Error('MONGODB_URI is not set')
  }

  await mongoose.connect(mongoURI)
}