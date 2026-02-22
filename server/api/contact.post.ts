import { Resend } from 'resend'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, message } = body ?? {}

  if (!name || !email || !message) {
    throw createError({ statusCode: 400, message: 'name, email, and message are required' })
  }

  const config = useRuntimeConfig(event)
  const resend = new Resend(config.resend.apiKey)

  const { error } = await resend.emails.send({
    from: 'Contact Form <onboarding@resend.dev>',
    to: config.resend.toEmail,
    replyTo: email,
    subject: `New message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
