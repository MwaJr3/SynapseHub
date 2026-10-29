# coursework/ — assessed work, kept apart from products

```
coursework/
└── cbu-assignments/   Four CBU assignments, a shared test suite and one real
                       full-stack application (TenantCore) that happens to live here.
```

Nothing outside this folder imports it, and it imports nothing outside itself. It
was prepared for its own branch — see `docs/branch-splits.md` — and that branch
(`split/cbu-assignments`) exists.

TenantCore is a genuine full-stack build sitting inside coursework, so the registry
marks it `separate` rather than `none`: the surface decides what a thing is, not
the folder it was filed in.
