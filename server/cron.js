import cron from 'node-cron'
import { Artwork } from './models/Artwork.js'
import { sendAuctionStartedEmail } from './services/mailer.js'

export function initCronJobs() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      
      // 1. Activate pending auctions
      const pendingToActive = await Artwork.find({
        status: 'pending',
        startTime: { $lte: now }
      }).populate('subscribers', 'email')

      for (const artwork of pendingToActive) {
        artwork.status = 'active'
        await artwork.save()
        console.log(`[CRON] Activated artwork: ${artwork.title}`)
        
        // Notify subscribers
        const emails = artwork.subscribers.map(sub => sub.email).filter(Boolean)
        if (emails.length > 0) {
          await sendAuctionStartedEmail(emails, artwork)
        }
      }

      // 2. End active auctions
      const activeToEnded = await Artwork.find({
        status: 'active',
        endTime: { $lte: now }
      })

      for (const artwork of activeToEnded) {
        artwork.status = 'ended'
        await artwork.save()
        console.log(`[CRON] Ended artwork: ${artwork.title}`)
      }

    } catch (error) {
      console.error('[CRON] Error running scheduled jobs:', error)
    }
  })
  
  console.log('Cron jobs initialized.')
}
