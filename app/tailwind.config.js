/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
  			arabic: ['Amiri Quran', 'Amiri', 'Traditional Arabic', 'serif'],
  			headline: ['Nunito', 'sans-serif'],
  			body: ['Nunito', 'sans-serif'],
  			label: ['Nunito', 'sans-serif']
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
  			"error": "#EA2B2B",
  			"surface": "#EFF9F9",
  			"on-error-container": "#93000a",
  			"surface-container": "#E6F4F4",
  			"primary-fixed": "#D5F3F3",
  			"on-error": "#ffffff",
  			"surface-dim": "#CFE3E3",
  			"outline-variant": "#E5E5E5",
  			"on-tertiary-container": "#4F3600",
  			"surface-container-highest": "#D5EBEB",
  			"tertiary-fixed": "#FDF0CF",
  			"secondary-container": "#D5F3F3",
  			"on-tertiary": "#ffffff",
  			"on-primary": "#ffffff",
  			"primary-fixed-dim": "#ABE7E8",
  			"on-surface": "#3C3C3C",
  			"surface-variant": "#DDEFEF",
  			"error-container": "#FFDFE0",
  			"tertiary": "#C98E14",
  			"surface-container-high": "#DDEFEF",
  			"on-secondary-fixed": "#053A3D",
  			"on-primary-fixed-variant": "#00666A",
  			"inverse-primary": "#74D6D8",
  			"on-background": "#3C3C3C",
  			"on-primary-container": "#D5F3F3",
  			"outline": "#AFAFAF",
  			"inverse-surface": "#2B3A3B",
  			"tertiary-fixed-dim": "#F2B530",
  			"surface-tint": "#00A3A8",
  			"inverse-on-surface": "#EFF9F9",
  			"secondary-fixed-dim": "#ABE7E8",
  			"surface-bright": "#F7FCFC",
  			"on-secondary": "#ffffff",
  			"surface-container-lowest": "#ffffff",
  			"surface-container-low": "#F5FBFB",
  			"on-secondary-container": "#00666A",
  			"on-surface-variant": "#777777",
  			"on-primary-fixed": "#053A3D",
  			"on-tertiary-fixed": "#3D2A00",
  			"secondary-fixed": "#D5F3F3",
  			"tertiary-container": "#F2B530",
  			"on-secondary-fixed-variant": "#00666A",
  			"primary-container": "#007C80",
  			"on-tertiary-fixed-variant": "#7A5600",
  			/* Palette Lagon : remplace les verts/teals codés en dur */
  			emerald: {50:'#EFF9F9',100:'#D5F3F3',200:'#ABE7E8',300:'#74D6D8',400:'#33BFC2',500:'#00A3A8',600:'#008C91',700:'#007C80',800:'#00666A',900:'#0B5457',950:'#053A3D'},
  			teal: {50:'#EFF9F9',100:'#D5F3F3',200:'#ABE7E8',300:'#74D6D8',400:'#33BFC2',500:'#00A3A8',600:'#008C91',700:'#007C80',800:'#00666A',900:'#0B5457',950:'#053A3D'},
  			green: {50:'#EFF9F9',100:'#D5F3F3',200:'#ABE7E8',300:'#74D6D8',400:'#33BFC2',500:'#00A3A8',600:'#008C91',700:'#007C80',800:'#00666A',900:'#0B5457',950:'#053A3D'},
  			lagon: { DEFAULT: '#00A3A8', lip: '#007C80', tint: '#D5F3F3', ink: '#00666A', bg: '#EFF9F9' },
  			gold: { DEFAULT: '#F2B530', lip: '#C98E14', tint: '#FDF3DC' },
  			ink: { DEFAULT: '#3C3C3C', 2: '#777777', 3: '#AFAFAF', line: '#E5E5E5' }
  		},
  		boxShadow: {
  			relief: '0 4px 0 0 var(--relief-color, #007C80)',
  			'relief-sm': '0 3px 0 0 var(--relief-color, #007C80)',
  			card: '0 2px 0 0 #E5E5E5',
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
