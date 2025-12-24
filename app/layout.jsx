import './globals.css'
import InactivityTracker from './components/InactivityTracker'

export const metadata = {
    title: 'Einflix - Gallery',
    description: 'Galería de archivos desde Google Drive'
}

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body>
                <InactivityTracker>
                    {children}
                </InactivityTracker>
            </body>
        </html>
    )
}
