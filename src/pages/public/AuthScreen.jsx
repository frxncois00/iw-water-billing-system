import { Droplet, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import './auth-screen.css'

export default function AuthScreen({ register = false, children }) {
  return <div className="iw-auth-page"><main className="iw-auth-scene">
    <section className="iw-auth-sheet" aria-labelledby="auth-title">
      <div className="iw-auth-banner"><Info size={17} aria-hidden="true"/> Isabel Waters customer portal</div>
      <div className="iw-auth-body"><h1 id="auth-title">{register ? 'Create an account' : 'Sign in'}</h1>
      <p className="iw-auth-switch">{register ? 'Already registered?' : 'New user?'}{' '}
        <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link>
      </p>
      {children}</div>
    </section>
  </main><footer className="iw-auth-footer"><Link className="iw-auth-brand" to="/"><Droplet size={20} aria-hidden="true"/> Isabel Waters</Link>
    <nav aria-label="Footer"><Link to="/#faqs">FAQs</Link><Link to="/concerns">Contact us</Link><Link to="/track">Track a request</Link></nav>
  </footer></div>
}
