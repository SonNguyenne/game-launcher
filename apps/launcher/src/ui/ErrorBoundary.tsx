import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

/** Chặn lỗi của một mini app để không làm sập cả launcher. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[mini-app]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}
