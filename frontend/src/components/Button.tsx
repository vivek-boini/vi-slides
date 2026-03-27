import './Button.css'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

function Button({ children, variant = 'primary', onClick, className = '', disabled = false, type = 'button' }: ButtonProps) {
  return (
    <button 
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  )
}

export default Button
