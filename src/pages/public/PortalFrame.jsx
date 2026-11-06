import { useEffect,useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import './portal.css'

export function PortalFrame({children}) {
  const {user,role}=useAuth()
  const location=useLocation()
  const menu=useRef(null)
  const portal=role==='admin'?'/admin':role==='cashier'?'/cashier':'/customer/dashboard'
  useEffect(()=>{
    menu.current.open=false
    if(location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0,0)
  },[location.pathname,location.hash])
  useEffect(()=>{
    function close(event){
      if(menu.current?.open && !menu.current.contains(event.target)) menu.current.open=false
    }
    document.addEventListener('pointerdown',close)
    return ()=>document.removeEventListener('pointerdown',close)
  },[])
  return <div className="reference-portal"><header><div className="w">
    <Link className="iw-wordmark" to="/"><i aria-hidden="true"/>Isabel Waters</Link>
    <nav aria-label="Main"><NavLink to="/pay">Pay your bill</NavLink>
      <details ref={menu} className="dd" onKeyDown={e=>{if(e.key==='Escape'){menu.current.open=false;menu.current.querySelector('summary').focus()}}}>
        <summary>Services</summary><div className="menu"><Link to="/apply">New connection</Link><Link to="/reconnect">Reconnection or disconnection</Link><Link to="/concerns" state={{topic:'Billing'}}>Meter or billing request</Link></div>
      </details>
      <NavLink to="/concerns">Report a concern</NavLink><NavLink to="/track">Track request</NavLink>
      <Link className="btn" to={user?portal:'/login'}>{user?'My portal':'Log in'}</Link>
    </nav></div></header><main>{children}</main>
    <footer><div className="w"><div><Link className="iw-wordmark" to="/"><i aria-hidden="true"/>Isabel Waters</Link><p>Water connections, meter readings, billing, and service requests.</p></div>
      <nav aria-label="Footer"><Link to="/pay">Pay your bill</Link><Link to="/apply">New connection</Link><Link to="/#faqs">FAQs</Link><Link to="/#contact">Contact</Link><Link to="/concerns">Report a concern</Link><Link to="/track">Track request</Link></nav>
    </div></footer></div>
}

export function PublicPage({title,intro,children}){
  return <PortalFrame><div className="page"><div className="w"><h1>{title}</h1><p className="lede">{intro}</p>{children}</div></div></PortalFrame>
}

export function AuthTabs(){
  return <nav className="auth-tabs" aria-label="Login options"><NavLink to="/login">Log in</NavLink><NavLink to="/register">Create a login</NavLink></nav>
}
