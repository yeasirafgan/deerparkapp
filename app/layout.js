// //mainfolder/app/layout.js

import { Inter } from 'next/font/google'; // Correct usage of Inter font
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Container from '@/components/Container';
import 'rc-pagination/assets/index.css';

// Use next/font's Inter to manage font preloading
const inter = Inter({ subsets: ['latin'], preload: false });

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body className={`${inter.className} bg-slate-100 min-h-screen`}>
        <Container>
          <Header />
          {children}
          <Footer />
        </Container>
      </body>
    </html>
  );
}
