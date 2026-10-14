import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-[110px] font-semibold leading-none text-clay sm:text-[150px]">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">This page has wandered off</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/60">
        The page you are looking for does not exist or may have been moved. Let's get you back to familiar ground.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-ink">Back to home</Link>
        <Link to="/events" className="btn-ghost-ink">Browse events</Link>
      </div>
    </div>
  )
}
