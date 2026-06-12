import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Privacy Policy — BS-PASS' }

const EFFECTIVE_DATE = 'June 12, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective {EFFECTIVE_DATE}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. What We Collect</h2>
            <p className="mb-2">We collect only what we need to provide the Service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account information:</strong> email address, display name, and optionally your full name, PRO affiliation, and IPI number.</li>
              <li><strong>Project data:</strong> projects, tracks, roadmap tasks, splits, and chat messages you create.</li>
              <li><strong>Files:</strong> audio stems and cover art you upload, stored in Supabase Storage.</li>
              <li><strong>Usage data:</strong> anonymised product analytics via PostHog (page views, feature interactions).</li>
              <li><strong>Error data:</strong> error traces via Sentry to help us debug issues. These may include browser and OS information.</li>
              <li><strong>Signature data:</strong> IP address and timestamp recorded when you sign a royalty split agreement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, maintain, and improve the Service.</li>
              <li>To generate AI-powered roadmaps and summaries using your project context.</li>
              <li>To send transactional emails (invitations, split signature requests). We do not send marketing email without explicit opt-in.</li>
              <li>To record royalty split agreement acceptances for audit purposes.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. AI and Third-Party LLM Processing</h2>
            <p>
              Project context (title, track names, task descriptions, collaborator roles) is sent to Groq's API to generate
              roadmap tasks and project summaries. This data is processed solely to return results and is not retained by
              Groq for model training. We do not send personally identifiable information such as email addresses or IPI
              numbers to the LLM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Data Sharing</h2>
            <p className="mb-2">We do not sell your data. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database, auth, and file storage infrastructure.</li>
              <li><strong>Groq</strong> — LLM API for AI features (project context only, see §3).</li>
              <li><strong>Resend</strong> — transactional email delivery.</li>
              <li><strong>PostHog</strong> — product analytics (anonymised).</li>
              <li><strong>Sentry</strong> — error monitoring (error traces, no payment data).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Active account data is retained for as long as your account exists.</li>
              <li>If you delete your account, data is purged within 30 days.</li>
              <li>Audit logs (including split signatures) are retained for 7 years as required for financial record-keeping.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Your Rights</h2>
            <p>
              Depending on your jurisdiction you may have the right to access, correct, or delete your personal data,
              or to restrict or object to its processing. To exercise these rights, email{' '}
              <a href="mailto:privacy@bspass.dev" className="text-primary hover:underline">privacy@bspass.dev</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Security</h2>
            <p>
              All data is encrypted in transit (TLS 1.2+) and at rest. Database access is protected by Row Level Security
              policies; every query is scoped to the authenticated user. We conduct periodic security reviews.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Cookies</h2>
            <p>
              We use a single session cookie issued by Supabase Auth to maintain your login state. We do not use
              third-party advertising cookies. PostHog analytics uses a first-party cookie that you can opt out of
              by enabling "Do Not Track" in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Children</h2>
            <p>
              The Service is not directed at children under 18. We do not knowingly collect data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes</h2>
            <p>
              We will notify you by email and in-app notice at least 7 days before any material changes to this policy
              take effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact</h2>
            <p>
              Privacy questions:{' '}
              <a href="mailto:privacy@bspass.dev" className="text-primary hover:underline">privacy@bspass.dev</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
