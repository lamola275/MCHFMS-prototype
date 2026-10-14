import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
  message: string
}

/** Last line of defence: any unexpected render error lands here instead of a white screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[MCHFMS] Uncaught UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="frame max-w-lg p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-clay bg-clay/10 text-clay">
            <TriangleAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold">Something unexpected happened</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">
            The page ran into a problem it could not recover from. Reloading usually fixes it — your data is safe in
            the database.
          </p>
          {this.state.message && (
            <p className="mt-4 rounded-xl bg-ink/5 px-4 py-2 font-mono text-xs text-ink/50">{this.state.message}</p>
          )}
          <button onClick={() => window.location.reload()} className="btn-clay mt-6">
            Reload the page
          </button>
        </div>
      </div>
    )
  }
}
