/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Inter', 'system-ui', 'sans-serif'],
  			arabic: ['Amiri Quran', 'Amiri', 'Traditional Arabic', 'serif'],
  			headline: ['Manrope', 'sans-serif'],
  			body: ['Manrope', 'sans-serif'],
  			label: ['Plus Jakarta Sans', 'sans-serif']
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			"error": "#ba1a1a",
  			"surface": "#fbf9f5",
  			"on-error-container": "#93000a",
  			"surface-container": "#efeeea",
  			"primary-fixed": "#bceecf",
  			"on-error": "#ffffff",
  			"surface-dim": "#dbdad6",
  			"outline-variant": "#c0c9c1",
  			"on-tertiary-container": "#4f3e00",
  			"surface-container-highest": "#e4e2de",
  			"tertiary-fixed": "#ffe088",
  			"secondary-container": "#c6edbf",
  			"on-tertiary": "#ffffff",
  			"on-primary": "#ffffff",
  			"primary-fixed-dim": "#a1d1b4",
  			"on-surface": "#1b1c1a",
  			"surface-variant": "#e4e2de",
  			"error-container": "#ffdad6",
  			"tertiary": "#735c00",
  			"surface-container-high": "#eae8e4",
  			"on-secondary-fixed": "#022106",
  			"on-primary-fixed-variant": "#224f39",
  			"inverse-primary": "#a1d1b4",
  			"on-background": "#1b1c1a",
  			"on-primary-container": "#9fcfb2",
  			"outline": "#717973",
  			"inverse-surface": "#30312e",
  			"tertiary-fixed-dim": "#e9c349",
  			"surface-tint": "#3a674f",
  			"inverse-on-surface": "#f2f0ed",
  			"secondary-fixed-dim": "#abd0a5",
  			"surface-bright": "#fbf9f5",
  			"on-secondary": "#ffffff",
  			"surface-container-lowest": "#ffffff",
  			"surface-container-low": "#f5f3ef",
  			"on-secondary-container": "#4b6d48",
  			"on-surface-variant": "#414943",
  			"on-primary-fixed": "#002112",
  			"on-tertiary-fixed": "#241a00",
  			"secondary-fixed": "#c6edbf",
  			"tertiary-container": "#cca830",
  			"on-secondary-fixed-variant": "#2e4e2d",
  			"primary-container": "#2d5a43",
  			"on-tertiary-fixed-variant": "#574500",
  			"stitch-bg": "#fbf9f5"
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			shimmer: {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' },
  			},
  			float: {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-10px)' },
  			},
  			'glow-pulse': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			shimmer: 'shimmer 2s linear infinite',
  			float: 'float 3s ease-in-out infinite',
  			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
