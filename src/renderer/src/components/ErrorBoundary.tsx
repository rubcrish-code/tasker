import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
  resetKey?: string
  title?: string
  message?: string
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Renderer view failed', error, errorInfo)
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <section className="error-boundary">
        <h2>{this.props.title ?? 'Раздел временно недоступен'}</h2>
        <p>{this.props.message ?? 'Произошла ошибка отображения. Данные сохранены, можно попробовать открыть раздел заново.'}</p>
        <button className="button button-primary" type="button" onClick={() => this.setState({ error: null })}>
          Повторить
        </button>
      </section>
    )
  }
}
