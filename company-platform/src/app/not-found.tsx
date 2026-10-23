import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-xl text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">
        That page does not exist on this platform. It may have been renamed, or
        it may not be published.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn btn-primary">Home</Link>
        <Link href="/products" className="btn btn-secondary">Browse products</Link>
      </div>
    </div>
  );
}
