var config = {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#e6f3ff',
                    100: '#cce8ff',
                    500: '#0f6dbf',
                    600: '#0a579a',
                    700: '#064170',
                    900: '#021c31'
                },
                accent: {
                    500: '#ff8a00',
                    600: '#db7600'
                }
            },
            fontFamily: {
                sans: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                heading: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif']
            },
            boxShadow: {
                card: '0 12px 30px rgba(8, 33, 56, 0.09)'
            }
        }
    },
    plugins: []
};
export default config;
