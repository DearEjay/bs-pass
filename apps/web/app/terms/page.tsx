import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Terms of Service — BS-PASS' }

const EFFECTIVE_DATE = 'June 12, 2026'
const VERSION = '2026-06-12'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective {EFFECTIVE_DATE} · Version {VERSION}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using BS-PASS ("the Service"), you agree to be bound by these Terms of Service
              and our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
            <p>
              BS-PASS is an AI-powered music project management platform for independent artists and their collaborators.
              Features include project tracking, roadmap generation, royalty split management, digital signature collection,
              file storage, and team collaboration tools.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Accounts and Eligibility</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least 18 years of age to use the Service.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You may not share your account or create accounts on behalf of others without their consent.</li>
              <li>You must provide accurate information when creating your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Royalty Splits and Digital Signatures</h2>
            <p className="mb-2">
              BS-PASS provides tools to document royalty split agreements and collect electronic signatures.
              <strong> Important disclaimer:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Split agreements created on BS-PASS are intended as a record-keeping aid and are <strong>not a substitute
                for legal advice</strong> or formally executed contracts.
              </li>
              <li>
                Electronic signatures collected through the platform indicate intent to agree to terms as documented in
                the platform at the time of signing, but their legal enforceability may vary by jurisdiction.
              </li>
              <li>
                We strongly recommend consulting a music attorney before entering into any binding royalty agreement.
              </li>
              <li>
                BS-PASS is not liable for disputes arising from split agreements created or managed on the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. User Content</h2>
            <p>
              You retain ownership of all content you upload (audio files, artwork, documents). By uploading content,
              you grant BS-PASS a limited, non-exclusive licence to store and display that content solely to provide
              the Service. We will not use your content for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. AI-Generated Content</h2>
            <p>
              BS-PASS uses AI to generate project roadmaps, task suggestions, and project summaries. AI-generated
              content is provided as a starting point and may not always be accurate or appropriate for your situation.
              You are responsible for reviewing and approving all AI-generated tasks and recommendations before acting
              on them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service to infringe intellectual property rights.</li>
              <li>Attempt to bypass or circumvent authentication or access controls.</li>
              <li>Upload malicious code, malware, or harmful content.</li>
              <li>Use the Service in any unlawful manner or for any unlawful purpose.</li>
              <li>Reverse-engineer, scrape, or systematically extract data from the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Termination</h2>
            <p>
              We may suspend or terminate your account at any time if you breach these Terms. You may delete your account
              at any time. Upon termination, your data will be retained for 30 days and then deleted, except where
              retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, BS-PASS shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or
              business opportunities arising out of your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we will update the version date above and notify
              you via email or an in-app notice. Continued use of the Service after such notice constitutes acceptance
              of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{' '}
              <a href="mailto:legal@bspass.dev" className="text-primary hover:underline">legal@bspass.dev</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
