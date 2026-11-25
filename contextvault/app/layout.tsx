import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { OfflineBanner, RequestStatus } from '../components/decor-client';
import '../components/decor/decor.css';
export const metadata:Metadata = { title:'ContextVault — Your knowledge, connected', description:'A document-grounded research workspace powered by PostgreSQL and pgvector.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><OfflineBanner /><RequestStatus />{children}</body></html>; }
