import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, CreditCard, Droplets, FileDown, FileText, History, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import { getCurrentRate } from '../../lib/api.js'
import { peso } from '../../lib/format.js'

const steps = [
  { number: '01', title: 'Register', text: 'Create your account with your service and meter details.' },
  { number: '02', title: 'Get approved', text: 'Our team verifies your meter number and activates your account.' },
  { number: '03', title: 'View your bill', text: 'See monthly usage, due dates, and balance in one place.' },
  { number: '04', title: 'Pay your way', text: 'Pay at the office or through the verified GCash channel.' },
]
const features = [
  { icon: FileText, title: 'Bills online', text: 'Your latest and past water bills, available whenever you need them.' },
  { icon: FileDown, title: 'Ready to print', text: 'Download a clean copy of each bill using your browser’s print dialog.' },
  { icon: History, title: 'Payment history', text: 'Review posted payments and references without the paper trail.' },
  { icon: Wallet, title: 'Balance at a glance', text: 'Know what is paid, partial, or still due before your next visit.' },
]

export default function Landing() {
  const [rate, setRate] = useState(null)
  useEffect(() => { getCurrentRate().then(setRate).catch(() => setRate(null)) }, [])
  const officeAddress = import.meta.env.VITE_OFFICE_ADDRESS
  const officeContact = import.meta.env.VITE_OFFICE_CONTACT
  return <div className="public-site">
    <header className="site-header container"><Link to="/" className="site-logo"><span><Droplets size={25} /></span><strong>ISABEL WATERS</strong></Link><nav aria-label="Public navigation"><Link to="/login" className="text-link">Log In</Link><Link to="/register" className="button button-small">Register <ArrowRight size={16} /></Link></nav></header>
    <main>
      <section className="hero container"><div className="hero-copy"><span className="hero-kicker"><span className="kicker-dot" /> A clearer way to manage your water account</span><h1>Every drop<br />accounted for<span className="hero-period">.</span></h1><p>View your water bills, follow your balance, and keep payment history close at hand. A simpler billing experience for the Isabel Waters community.</p><div className="hero-actions"><Link to="/register" className="button button-large">Create an account <ArrowRight size={18} /></Link><Link to="/login" className="button button-outline button-large">Log in</Link></div><div className="hero-note"><ShieldCheck size={18} /> Secure access to your own account</div></div><div className="hero-art" aria-hidden="true"><div className="hero-art-grid" /><div className="water-orbit orbit-one" /><div className="water-orbit orbit-two" /><div className="water-drop"><Droplets size={92} strokeWidth={1.2} /></div><div className="floating-bill"><span>MONTHLY WATER BILL</span><strong>Simple. Clear. Yours.</strong><i /><i /><i className="short" /></div><div className="floating-check"><CheckCircle2 size={18} /> Stay on top of due dates</div></div></section>
      <section className="how-section" id="how-it-works"><div className="container"><div className="section-heading"><div><p className="eyebrow">GET STARTED</p><h2>How it works</h2></div><p>From registration to your next payment, everything follows a simple path.</p></div><div className="steps-grid">{steps.map((step) => <div className="step-card" key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></div></section>
      <section className="features-section container"><div className="section-heading"><div><p className="eyebrow">YOUR ACCOUNT, IN VIEW</p><h2>Made for everyday clarity</h2></div><p>The details you need are always easy to find.</p></div><div className="feature-grid">{features.map(({ icon: Icon, title, text }) => <div className="feature-card" key={title}><span className="feature-icon"><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
      <section className="info-section container"><div className="rate-panel"><span className="info-icon"><Droplets /></span><p className="eyebrow">CURRENT WATER RATE</p><h2>{rate ? peso(rate.rate_per_m3) : 'Rate unavailable'} <small>per m³</small></h2><p>{rate ? `Effective ${new Date(`${rate.effective_from}T12:00:00Z`).toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'UTC' })}. Your bill shows the rate applied to that billing period.` : 'Please contact the office for the current rate.'}</p></div><div className="office-panel"><span className="info-icon"><MapPin /></span><p className="eyebrow">OFFICE & PAYMENT HELP</p><h2>We’re here to help.</h2><p>{officeAddress || 'Visit the Isabel Waters service office for in-person payment and account assistance.'}</p><p>{officeContact || 'For the official office number and GCash details, please contact the service office directly.'}</p><div className="office-chips"><span><Clock3 size={16} /> Ask about office hours</span><span><CreditCard size={16} /> Verify GCash before paying</span></div></div></section>
      <section className="closing-cta"><div className="container"><div><p className="eyebrow">READY TO BEGIN?</p><h2>Your water account, a little easier.</h2></div><Link to="/register" className="button button-light">Register now <ArrowRight size={18} /></Link></div></section>
    </main>
    <footer className="site-footer container"><span className="site-logo"><span><Droplets size={20} /></span><strong>ISABEL WATERS</strong></span><p>Billing & Collection · Water service made clearer.</p><small>© {new Date().getFullYear()} Isabel Waters</small></footer>
  </div>
}
