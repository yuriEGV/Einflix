import './globals.css'

export const metadata = {
    title: 'Einflix - Gallery',
    description: 'Galería de archivos desde Google Drive'
}

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body>
                {children}
            </body>
        </html>
    )
}
