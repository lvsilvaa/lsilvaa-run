import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({
  className = '',
  size = 'md',
}: LogoProps) {

  const sizes = {
    sm: 120,
    md: 180,
    lg: 240,
  }

  return (
    <div className={className}>
      <Image
        src="/images/logo.png"
        alt="LSilvaa Running"
        width={sizes[size]}
        height={sizes[size]}
        priority
      />
    </div>
  )
}