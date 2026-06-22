import cron from 'node-cron'
import { Artwork } from './models/Artwork.js'
import { User } from './models/User.js'
import { sendAuctionStartedEmail, sendTransactionEmail } from './services/mailer.js'

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

      // 2. End active auctions and process wallet transfers
      const activeToEnded = await Artwork.find({
        status: 'active',
        endTime: { $lte: now }
      })

      for (const artwork of activeToEnded) {
        artwork.status = 'ended'
        await artwork.save()
        console.log(`[CRON] Ended artwork: ${artwork.title}`)

        // Process wallet transfer if there was a winning bid
        if (artwork.currentBid && artwork.currentBidder) {
          const buyer = await User.findById(artwork.currentBidder)
          const seller = await User.findById(artwork.ownerId)
          const amount = artwork.currentBid

          if (buyer && seller) {
            // Deduct from buyer
            buyer.coins = Math.max(0, buyer.coins - amount)
            await buyer.save()
            console.log(`[CRON] Deducted $${amount} from ${buyer.username} (balance: ${buyer.coins})`)

            // Add to seller
            seller.coins += amount
            await seller.save()
            console.log(`[CRON] Added $${amount} to ${seller.username} (balance: ${seller.coins})`)

            // Send confirmation emails
            await sendTransactionEmail({
              buyerEmail: buyer.email,
              sellerEmail: seller.email,
              artworkTitle: artwork.title,
              amount,
            })
          }
        }
      }

    } catch (error) {
      console.error('[CRON] Error running scheduled jobs:', error)
    }
  })
  
  console.log('Cron jobs initialized.')
}
