import { Resend } from 'resend'
import { checkRateLimit } from '../utils/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  if (!checkRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000)) {
    throw createError({ statusCode: 429, message: 'Too many requests. Please wait a few minutes.' })
  }

  const body = await readBody(event)
  const { name, email, message } = body ?? {}

  if (!name || !email || !message) {
    throw createError({ statusCode: 400, message: 'name, email, and message are required.' })
  }

  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
    throw createError({ statusCode: 400, message: 'Name must be between 2 and 100 characters.' })
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    throw createError({ statusCode: 400, message: 'A valid email address is required.' })
  }

  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 5000) {
    throw createError({ statusCode: 400, message: 'Message must be between 10 and 5000 characters.' })
  }

  const config = useRuntimeConfig(event)
  const resend = new Resend(config.resend.apiKey)

  const { error } = await resend.emails.send({
    from: 'Contact Form <contact@giancarlopapa.com>',
    to: config.resend.toEmail,
    replyTo: email.trim(),
    subject: `New message from ${name.trim()}`,
    text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`
  })

  if (error) {
    console.error('[api/contact] Resend error', error)
    throw createError({ statusCode: 500, message: 'Failed to send message. Please try again.' })
  }

  return { success: true }
})
