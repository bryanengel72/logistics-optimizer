import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Sectional | Driveaway Profit Optimizer',description:'Plan better loads. Know your costs. Build a more profitable driveaway week.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" className="dark"><body>{children}</body></html>}
