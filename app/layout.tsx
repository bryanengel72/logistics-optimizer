import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://sectional-driveaway.mbe2011.chatgpt.site'),
  title: {
    default: 'Sectional | Driveaway Profit Optimizer',
    template: '%s | Sectional',
  },
  description:
    'Plan better loads. Know your costs. Build a more profitable driveaway week.',
  openGraph: {
    type: 'website',
    url: 'https://sectional-driveaway.mbe2011.chatgpt.site',
    siteName: 'Sectional',
    title: 'Sectional | Driveaway Profit Optimizer',
    description:
      'Find the loads and routes that maximize your take-home profit.',
    images: [
      {
        url: '/sectional-social-preview.png',
        width: 1733,
        height: 907,
        alt: 'White box truck on an open highway for Sectional driveaway logistics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sectional | Driveaway Profit Optimizer',
    description:
      'Find the loads and routes that maximize your take-home profit.',
    images: ['/sectional-social-preview.png'],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light">
      <body>{children}</body>
    </html>
  );
}
