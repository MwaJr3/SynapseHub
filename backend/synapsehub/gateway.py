"""User-scoped Supabase REST gateway. No service-role credentials are accepted."""
import os
import httpx
from fastapi import HTTPException


class Gateway:
    def __init__(self, token: str):
        self.url = os.getenv('SUPABASE_URL', '').rstrip('/')
        self.key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
        self.token = token
        if self.key.startswith('sb_secret_'):
            raise HTTPException(503, 'Use a publishable key, not a service-role key.')
        if not self.url.startswith('https://') or not self.key:
            raise HTTPException(503, 'Cloud storage is not configured.')

    async def request(self, method, path, **kwargs):
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.request(method, self.url + path, headers={
                    'apikey': self.key, 'Authorization': f'Bearer {self.token}',
                    'Content-Type': 'application/json',
                }, **kwargs)
            if response.status_code in (401, 403):
                raise HTTPException(401, 'Session expired or access denied.')
            if not response.is_success:
                raise HTTPException(502, 'Cloud operation failed. No success was recorded.')
            return response.json() if response.content else None
        except httpx.HTTPError as exc:
            raise HTTPException(503, 'Cloud service is unreachable. Try again without discarding local changes.') from exc

    async def verify(self):
        user = await self.request('GET', '/auth/v1/user')
        if not user or not user.get('id'):
            raise HTTPException(401, 'A valid user session is required.')
        return self

    async def rpc(self, name, args):
        return await self.request('POST', f'/rest/v1/rpc/{name}', json=args)

    async def get_workspace(self):
        rows = await self.request('GET', '/rest/v1/sh_workspaces?select=revision,payload')
        return rows[0] if rows else {'revision': 0, 'payload': {'version': 1, 'revision': 0, 'items': [], 'relations': []}}

    async def documents(self):
        return await self.request('GET', '/rest/v1/sh_documents?select=id,title,pages,created_at&order=created_at.desc&limit=200')

    async def document(self, doc_id):
        rows = await self.request('GET', f'/rest/v1/sh_documents?id=eq.{doc_id}&select=id,title,pages,pdf')
        if not rows:
            raise HTTPException(404, 'Document not found.')
        return rows[0]

    async def delete_document(self, doc_id):
        await self.request('DELETE', f'/rest/v1/sh_documents?id=eq.{doc_id}')
