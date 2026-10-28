"""Opt-in release probe. Never prints credentials, answers or user document content.

Run with Python from the repository root. --ollama only queries model availability;
--generate sends a fixed synthetic, non-private evidence fixture to that service.
"""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from synapsehub.rag import generate_answer


async def probe(cloud=False, ollama=False, generate=False):
    results = []
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        if cloud:
            url = os.getenv('SUPABASE_URL', '').rstrip('/')
            key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
            if not url.startswith('https://') or not key:
                raise ValueError('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.')
            headers = {'apikey': key}
            settings = await client.get(f'{url}/auth/v1/settings', headers=headers)
            settings.raise_for_status()
            if settings.json().get('mailer_autoconfirm') is not False:
                raise ValueError('Email confirmation must remain required.')
            results.append('supabase_auth_reachable_confirmation_required')
            private = await client.get(f'{url}/rest/v1/sh_documents?select=id&limit=1', headers=headers)
            if private.status_code not in (401, 403):
                raise ValueError('Anonymous private-library access did not fail closed.')
            results.append('anonymous_library_access_denied')
        if ollama or generate:
            url = os.getenv('OLLAMA_URL', '').rstrip('/')
            model = os.getenv('OLLAMA_MODEL', '')
            if not url or not model:
                raise ValueError('Set OLLAMA_URL and OLLAMA_MODEL; no model endpoint is assumed.')
            key = os.getenv('OLLAMA_API_KEY', '')
            tags = await client.get(f'{url}/api/tags', headers={'Authorization': f'Bearer {key}'} if key else {})
            tags.raise_for_status()
            names = {row.get('name', '') for row in tags.json().get('models', [])}
            if model not in names and f'{model}:latest' not in names:
                raise ValueError('Configured model is not installed at this Ollama service.')
            results.append('ollama_model_available')
    if generate:
        evidence = [{'id': '11111111-1111-4111-8111-111111111111',
                     'document_id': '22222222-2222-4222-8222-222222222222',
                     'page': 1, 'title': 'Synthetic release fixture',
                     'text': 'Voltage is measured in volts.'}]
        answer = await generate_answer('What unit measures voltage?', evidence)
        if not answer:
            raise ValueError('Model returned no claims for the fixed answerable fixture.')
        results.append('synthetic_cited_generation_validated')
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cloud', action='store_true')
    parser.add_argument('--ollama', action='store_true')
    parser.add_argument('--generate', action='store_true', help='Explicit consent to send a synthetic fixture for generation')
    args = parser.parse_args()
    if not any(vars(args).values()):
        parser.error('Choose --cloud, --ollama or --generate. No checks run by default.')
    try:
        print(json.dumps({'checks_passed': asyncio.run(probe(**vars(args)))}))
    except Exception:
        # Provider exception messages can include signed URLs or tokens. Never echo them.
        print(json.dumps({'status': 'failed', 'reason': 'Runtime verification failed. Check configuration, network, provider/model availability and email policy.'}), file=sys.stderr)
        sys.exit(1)
