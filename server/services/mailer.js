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
