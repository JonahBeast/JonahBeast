export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: '#F7F2E7',
          100: '#F2E9D8',
          200: '#E3D6BC',
          300: '#C9B99C',
          400: '#A99E8C',
          500: '#8A7F6E',
          600: '#6B6255',
          700: '#4A4136',
          800: '#2A2016',
          900: '#1B140E',
          950: '#16110D',
        },
        orange: {
          50: '#FDF0E6',
          100: '#FBDCC4',
          200: '#F6BF8E',
          300: '#F5A468',
          400: '#FF7020',
          500: '#E8590C',
          600: '#C24A0A',
          700: '#8F3708',
          800: '#6B2905',
          900: '#4A1C03',
          950: '#2E1102',
        },
      },
      // Beast irradia luz: brillo naranja que "respira" alrededor del gorila.
      keyframes: {
        'jb-brillo': {
          '0%, 100%': { boxShadow: '0 0 10px 2px rgba(255,112,32,0.55), 0 0 22px 6px rgba(232,89,12,0.30)' },
          '50%': { boxShadow: '0 0 18px 5px rgba(255,112,32,0.85), 0 0 36px 12px rgba(232,89,12,0.45)' },
        },
      },
      animation: {
        'jb-brillo': 'jb-brillo 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
