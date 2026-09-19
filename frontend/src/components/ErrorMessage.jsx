import { Coffee } from 'lucide-react';

export const SUPPORT_URL = 'https://buymeacoffee.com/manojthapa';

// Renders an API error, special-casing the backend's "server busy" message
function ErrorMessage({ message }) {
    if (message.includes('buymeacoffee')) {
        return (
            <span>
                The server is busy due to high demand. Please try again shortly, or{' '}
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                    <Coffee size={14} /> help keep it running
                </a>
                .
            </span>
        );
    }
    return <span>{message}</span>;
}

export default ErrorMessage;
