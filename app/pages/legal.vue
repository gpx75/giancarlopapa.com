<script setup lang="ts">
useSeoMeta({
  title: 'Legal — Giancarlo Papa',
  description: 'Privacy policy, legal notice, and disclaimer for giancarlopapa.com.'
})
</script>

<template>
  <UContainer class="max-w-3xl space-y-16 py-16">
    <div class="space-y-3">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span class="text-terminal-400/60">~/</span>legal
      </UBadge>
      <h1>Legal</h1>
      <p class="text-muted/80">
        Privacy policy, legal notice, and disclaimer for giancarlopapa.com.<br>
        <span class="text-xs text-muted/50">Last updated: 22 February 2026 · Governed by Swiss law</span>
      </p>
    </div>

    <!-- Legal Notice -->
    <section id="legal-notice" class="space-y-6">
      <div class="space-y-1">
        <h2>Legal Notice</h2>
        <p class="text-sm text-muted/60">Impressum — required under Swiss and EU law</p>
      </div>
      <UCard class="prose dark:prose-invert max-w-none">
        <p>This website is operated by a private individual:</p>
        <table>
          <tbody>
            <tr>
              <td class="font-medium">Name</td>
              <td>Giancarlo Papa</td>
            </tr>
            <tr>
              <td class="font-medium">Location</td>
              <td>Elsau, Canton Zürich, Switzerland</td>
            </tr>
            <tr>
              <td class="font-medium">Email</td>
              <td><a href="mailto:hello@giancarlopapa.com">hello@giancarlopapa.com</a></td>
            </tr>
            <tr>
              <td class="font-medium">Website</td>
              <td><a href="https://giancarlopapa.com">giancarlopapa.com</a></td>
            </tr>
          </tbody>
        </table>
        <p class="text-sm text-muted/70">
          This is a personal portfolio website. No VAT number or commercial registration applies.
        </p>
      </UCard>
    </section>

    <!-- Privacy Policy -->
    <section id="privacy" class="space-y-6">
      <div class="space-y-1">
        <h2>Privacy Policy</h2>
        <p class="text-sm text-muted/60">Compliant with Swiss nDSG and EU GDPR</p>
      </div>
      <div class="prose dark:prose-invert max-w-none space-y-6">
        <UCard>
          <h3>1. Controller</h3>
          <p>
            Giancarlo Papa, Elsau ZH, Switzerland (<em>«I»</em>, <em>«me»</em>) is the data controller for all personal data processed through this website.
          </p>
        </UCard>

        <UCard>
          <h3>2. Data I collect and why</h3>
          <p><strong>Contact form</strong> — name, email address, and message. Used solely to respond to your inquiry. Legal basis: Art. 6(1)(b) GDPR / nDSG legitimate interest.</p>
          <p><strong>Booking</strong> — name, email address, timezone, and optional session notes. Passed to Cal.com to create a calendar appointment. Legal basis: Art. 6(1)(b) GDPR — pre-contractual steps.</p>
          <p><strong>Authentication</strong> — when you sign in via GitHub, Google, or LinkedIn, I receive your name, email address, and profile picture from that provider. This is stored in a secure, HTTP-only session cookie for the duration of your visit only. It is not persisted in any database.</p>
          <p><strong>Server logs</strong> — Vercel may log IP addresses and request metadata for security and performance purposes. I do not access or process these logs for marketing purposes.</p>
        </UCard>

        <UCard>
          <h3>3. Cookies</h3>
          <p>This site uses <strong>one HTTP-only session cookie</strong> for authentication state. No analytics, advertising, or tracking cookies are set. No cookie banner is necessary.</p>
        </UCard>

        <UCard>
          <h3>4. Third-party processors</h3>
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Purpose</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vercel Inc.</td>
                  <td>Hosting &amp; CDN</td>
                  <td>USA</td>
                </tr>
                <tr>
                  <td>Resend Inc.</td>
                  <td>Transactional email</td>
                  <td>USA</td>
                </tr>
                <tr>
                  <td>Cal.com Inc.</td>
                  <td>Appointment scheduling</td>
                  <td>USA</td>
                </tr>
                <tr>
                  <td>GitHub (Microsoft)</td>
                  <td>OAuth sign-in</td>
                  <td>USA</td>
                </tr>
                <tr>
                  <td>Google LLC</td>
                  <td>OAuth sign-in</td>
                  <td>USA</td>
                </tr>
                <tr>
                  <td>LinkedIn (Microsoft)</td>
                  <td>OAuth sign-in</td>
                  <td>USA</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-sm text-muted/70">
            US-based processors operate under Standard Contractual Clauses (SCCs) or equivalent transfer mechanisms recognised under Swiss and EU law.
          </p>
        </UCard>

        <UCard>
          <h3>5. Retention</h3>
          <p>Contact and booking messages are retained only as long as necessary to handle your inquiry. Session data is deleted when you sign out or the session expires. No personal data is stored in a persistent database by this site.</p>
        </UCard>

        <UCard>
          <h3>6. Your rights</h3>
          <p>Under the Swiss nDSG and EU GDPR you have the right to:</p>
          <ul>
            <li>Access the personal data I hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Restrict or object to processing</li>
            <li>Request data portability</li>
            <li>Lodge a complaint with the Swiss Federal Data Protection Commissioner (FDPIC) or your local supervisory authority</li>
          </ul>
          <p>To exercise any of these rights, email <a href="mailto:hello@giancarlopapa.com">hello@giancarlopapa.com</a>.</p>
        </UCard>
      </div>
    </section>

    <!-- Disclaimer -->
    <section id="disclaimer" class="space-y-6">
      <div class="space-y-1">
        <h2>Disclaimer</h2>
        <p class="text-sm text-muted/60">Liability limitations and intellectual property</p>
      </div>
      <div class="prose dark:prose-invert max-w-none space-y-6">
        <UCard>
          <h3>Accuracy of content</h3>
          <p>The content of this website is provided for general information and personal portfolio purposes only. While I strive for accuracy, I make no warranties — express or implied — about completeness, reliability, or fitness for a particular purpose. Information may become outdated without notice.</p>
        </UCard>

        <UCard>
          <h3>External links</h3>
          <p>This site may contain links to third-party websites. These links are provided for convenience only. I have no control over the content of linked sites and accept no responsibility for them or for any loss or damage that may arise from your use of them.</p>
        </UCard>

        <UCard>
          <h3>Intellectual property</h3>
          <p>All original content on this website — including text, design, and source code — is © {{ new Date().getFullYear() }} Giancarlo Papa. All rights reserved unless otherwise stated. You may not reproduce, distribute, or create derivative works without prior written permission.</p>
        </UCard>

        <UCard>
          <h3>Limitation of liability</h3>
          <p>To the maximum extent permitted by applicable law, I accept no liability for any direct, indirect, incidental, or consequential damages arising from your use of this website or reliance on its content.</p>
        </UCard>

        <UCard>
          <h3>Governing law &amp; jurisdiction</h3>
          <p>This website is operated from Switzerland. Any disputes relating to this website or its content shall be governed exclusively by Swiss law. The courts of the Canton of Zürich shall have exclusive jurisdiction, subject to mandatory provisions of applicable consumer protection law.</p>
        </UCard>
      </div>
    </section>

    <p class="text-xs text-muted/40 border-t border-muted/10 pt-8">
      Questions about this page? Email <a href="mailto:hello@giancarlopapa.com" class="underline hover:text-foreground transition">hello@giancarlopapa.com</a>.
    </p>
  </UContainer>
</template>
