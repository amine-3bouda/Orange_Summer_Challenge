import nodemailer from 'nodemailer'

let transporter = null

async function initMailer() {
  if (transporter) return transporter

  // Using a test ethereal account to avoid needing real credentials
  let account = await nodemailer.createTestAccount()
  
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  })
  
  console.log('Mailer initialized with test account:', account.user)
  return transporter
}

export async function sendAuctionStartedEmail(emails, artwork) {
  if (emails.length === 0) return

  try {
    const t = await initMailer()

    const info = await t.sendMail({
      from: '"Artwork Gallery" <noreply@gallery.test>',
      to: emails.join(', '),
      subject: `Auction Started: ${artwork.title}`,
      text: `The auction for "${artwork.title}" has officially started! The starting price is $${artwork.startingPrice}. Visit the gallery to place your bids.`,
      html: `<h3>Auction Started!</h3><p>The auction for <strong>${artwork.title}</strong> has officially started!</p><p>The starting price is $${artwork.startingPrice}.</p>`,
    })

    console.log('Message sent: %s', info.messageId)
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
  } catch (err) {
    console.error('Failed to send email:', err)
  }
}

export async function sendTransactionEmail({ buyerEmail, sellerEmail, artworkTitle, amount }) {
  try {
    const t = await initMailer()

    // Email to buyer
    const buyerInfo = await t.sendMail({
      from: '"Artwork Gallery" <noreply@gallery.test>',
      to: buyerEmail,
      subject: `Purchase Confirmation: ${artworkTitle}`,
      text: `Congratulations! You won the auction for "${artworkTitle}" with a winning bid of $${amount.toFixed(2)}. The amount has been deducted from your wallet.`,
      html: `<h3>🎉 Purchase Confirmation</h3>
        <p>Congratulations! You won the auction for <strong>${artworkTitle}</strong>.</p>
        <p><strong>Winning bid:</strong> $${amount.toFixed(2)}</p>
        <p>The amount has been deducted from your wallet.</p>`,
    })
    console.log('[MAIL] Buyer confirmation sent: %s', buyerInfo.messageId)
    console.log('[MAIL] Buyer preview: %s', nodemailer.getTestMessageUrl(buyerInfo))

    // Email to seller
    const sellerInfo = await t.sendMail({
      from: '"Artwork Gallery" <noreply@gallery.test>',
      to: sellerEmail,
      subject: `Sale Confirmation: ${artworkTitle}`,
      text: `Your artwork "${artworkTitle}" has been sold for $${amount.toFixed(2)}! The amount has been added to your wallet.`,
      html: `<h3>💰 Sale Confirmation</h3>
        <p>Your artwork <strong>${artworkTitle}</strong> has been sold!</p>
        <p><strong>Sale price:</strong> $${amount.toFixed(2)}</p>
        <p>The amount has been added to your wallet.</p>`,
    })
    console.log('[MAIL] Seller confirmation sent: %s', sellerInfo.messageId)
    console.log('[MAIL] Seller preview: %s', nodemailer.getTestMessageUrl(sellerInfo))
  } catch (err) {
    console.error('Failed to send transaction emails:', err)
  }
}
