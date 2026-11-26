import { Link } from 'react-router-dom'
import InfoLayout, { Prose } from '../../components/common/InfoLayout'
import { SITE } from '../../data/site'

export function PrivacyPage() {
  return (
    <InfoLayout eyebrow="Legal" title="Privacy policy" updated="November 2026">
      <Prose>
        <p>Dome Nepal respects your privacy. This page explains what we collect when you use our website and why.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Details you give us when ordering: name, phone, email and delivery address.</li>
          <li>Account details if you register: name, email and a securely hashed password.</li>
          <li>Basic technical data such as browser type, used to keep the site working.</li>
        </ul>
        <h2>How we use it</h2>
        <ul>
          <li>To process, deliver and support your orders, including contacting you about delivery.</li>
          <li>To send order confirmations and, only if you subscribe, news and offers.</li>
        </ul>
        <h2>Sharing</h2>
        <p>We share your name, phone and address with the courier delivering your order. We never sell your personal information.</p>
        <h2>Your choices</h2>
        <p>You can ask us to view, correct or delete your data at any time by contacting <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </Prose>
    </InfoLayout>
  )
}

export function TermsPage() {
  return (
    <InfoLayout eyebrow="Legal" title="Terms of service" updated="November 2026">
      <Prose>
        <p>By placing an order with Dome Nepal you agree to the following terms.</p>
        <h2>Orders &amp; pricing</h2>
        <ul>
          <li>All prices are in Nepali Rupees (NPR). Delivery fees depend on your district and are shown before you order.</li>
          <li>An order is confirmed once we contact you or dispatch your parcel. We may cancel orders if stock is unavailable or details are incorrect.</li>
        </ul>
        <h2>Payment</h2>
        <p>Orders are paid in cash on delivery. Please keep the exact amount ready and check your parcel when it arrives.</p>
        <h2>Delivery, returns &amp; cancellations</h2>
        <p>Delivery times, returns and exchanges are described on the <Link to="/shipping-returns">Shipping &amp; Returns</Link> page. You can cancel from your order page while it is Pending or Processing.</p>
        <h2>Contact</h2>
        <p>Questions about these terms? <Link to="/contact">Contact us</Link>.</p>
      </Prose>
    </InfoLayout>
  )
}
