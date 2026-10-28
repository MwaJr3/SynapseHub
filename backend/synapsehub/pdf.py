"""Bounded extraction in a child process. Never execute PDF actions or embedded files."""
from io import BytesIO
import os
from pypdf import PdfReader

MAX_BYTES = (4 if os.getenv('VERCEL') else 5) * 1024 * 1024
MAX_PAGES = 100
MAX_TEXT = 200000


def extract_pdf(data: bytes) -> dict:
    if len(data) > MAX_BYTES or not data.startswith(b'%PDF-'):
        raise ValueError(f'Upload a PDF no larger than {MAX_BYTES // (1024 * 1024)} MiB.')
    try:
        reader = PdfReader(BytesIO(data), strict=True)
        if reader.is_encrypted:
            raise ValueError('Encrypted PDFs are not supported.')
        count = len(reader.pages)
        if not 1 <= count <= MAX_PAGES:
            raise ValueError('PDF must have 1–100 pages.')
        chunks = []
        total = 0
        empty_pages = []
        for page_number, page in enumerate(reader.pages, 1):
            text = (page.extract_text() or '').replace('\x00', '').strip()
            total += len(text)
            if total > MAX_TEXT:
                raise ValueError('PDF extracted text exceeds 200,000 characters.')
            if not text:
                empty_pages.append(page_number)
            # Page boundaries are never crossed, so citations always retain their page.
            for start in range(0, len(text), 1000):
                passage = text[start:start + 1200].strip()
                if passage:
                    chunks.append({'page': page_number, 'ordinal': len(chunks), 'text': passage})
        if not chunks:
            raise ValueError('No extractable text. Scanned PDFs require OCR, which is not configured.')
        return {'pages': count, 'chunks': chunks, 'empty_pages': empty_pages}
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError('PDF could not be parsed safely.') from exc


def _child(data, output):
    # Linux production resource limits; platforms without resource still have parent timeout.
    try:
        try:
            import resource
            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024**2, 512 * 1024**2))
            resource.setrlimit(resource.RLIMIT_CPU, (15, 15))
        except ImportError:
            pass
        output.send({'ok': extract_pdf(data)})
    except Exception as exc:
        output.send({'error': str(exc) if isinstance(exc, ValueError) else 'PDF processing failed.'})
    finally:
        output.close()


def bounded_extract(data: bytes):
    import multiprocessing
    ctx = multiprocessing.get_context('spawn')
    receiver, sender = ctx.Pipe(duplex=False)
    process = ctx.Process(target=_child, args=(data, sender))
    process.start()
    sender.close()
    try:
        if not receiver.poll(20):
            raise ValueError('PDF processing timed out.')
        try:
            result = receiver.recv()
        except EOFError as exc:
            raise ValueError('PDF exceeded processing limits.') from exc
        if 'error' in result:
            raise ValueError(result['error'])
        return result['ok']
    finally:
        receiver.close()
        if process.is_alive():
            process.terminate()
        process.join(timeout=2)
        if process.is_alive():
            process.kill()
            process.join()
