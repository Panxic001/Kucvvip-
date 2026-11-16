import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-12 h-12",
  xl: "w-16 h-16"
};

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const logoSize = sizeClasses[size];
  
  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <div className={cn("gradient-primary rounded-lg flex items-center justify-center", logoSize)}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-2/3 h-2/3"
        >
          {/* K letter stylized with crypto/trading theme */}
          <g fill="white">
            {/* Left vertical line of K */}
            <rect x="6" y="6" width="3" height="20" rx="1.5" />
            
            {/* Upper diagonal line */}
            <path d="M10 6 L24 6 C25.1 6 26 6.9 26 8 C26 8.5 25.8 9 25.4 9.3 L17 15.5 L25.4 22.7 C25.8 23 26 23.5 26 24 C26 25.1 25.1 26 24 26 L18 26 C17.2 26 16.5 25.6 16.1 25 L12 19.5 L10 21.5 V25 C10 25.6 9.6 26 9 26 C8.4 26 8 25.6 8 25 V8 C8 6.9 8.9 6 10 6 Z" />
            
            {/* Geometric accent - triangle */}
            <path d="M20 10 L26 16 L20 16 Z" opacity="0.8" />
            
            {/* Small dots for crypto theme */}
            <circle cx="22" cy="20" r="1.5" opacity="0.9" />
            <circle cx="19" cy="23" r="1" opacity="0.7" />
          </g>
          
          {/* Gradient overlay for depth */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {showText && (
        <span className="text-xl font-bold gradient-text">KuCoin VIP</span>
      )}
    </div>
  );
}

export function LogoIcon({ className, size = "md" }: Omit<LogoProps, "showText">) {
  return <Logo className={className} size={size} showText={false} />;
}