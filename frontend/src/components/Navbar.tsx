import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/teacher/dashboard" className="logo">
          <span className="logo-vi">Vi</span>
          <span className="logo-slides">-SlideS</span>
        </Link>
        
        <div className="nav-links">
          <Link to="/teacher/dashboard" className="nav-link">Dashboard</Link>
        </div>
        
        <div className="nav-right">
          <div className="avatar">T</div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
