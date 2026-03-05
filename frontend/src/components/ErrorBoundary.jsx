import { Component } from 'react';

/**
 * ErrorBoundary — catches runtime errors in child components and displays
 * a visual error message instead of the blank white screen.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info?.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: '#0f172a', color: '#f1f5f9', padding: '2rem', fontFamily: 'sans-serif'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️ Something went wrong</h1>
                    <pre style={{
                        background: '#1e293b', padding: '1rem', borderRadius: '0.5rem',
                        maxWidth: '600px', overflow: 'auto', fontSize: '0.85rem', color: '#fca5a5'
                    }}>
                        {this.state.error?.message || 'Unknown error'}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1.5rem', padding: '0.5rem 1.5rem',
                            background: '#4f46e5', color: 'white', border: 'none',
                            borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem'
                        }}
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
