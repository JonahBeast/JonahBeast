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
          // Se apaga y se enciende bien marcado, para que llame la atención.
          // No depende de "reducir movimiento": es solo luz, el gorila no se mueve.
          '0%, 100%': { boxShadow: '0 0 6px 1px rgba(255,112,32,0.35), 0 0 12px 2px rgba(232,89,12,0.15)' },
          '50%': { boxShadow: '0 0 22px 8px rgba(255,112,32,0.95), 0 0 44px 16px rgba(232,89,12,0.55)' },
        },
      },
      animation: {
        'jb-brillo': 'jb-brillo 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
