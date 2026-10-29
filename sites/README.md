# sites/ — properties that are not company products

```
sites/
├── portfolio/   The personal portfolio site — the one that also renders the 60
│                challenge prototypes. Published by neither company.
└── archive/     Two scratch folders kept, unmodified, for reference:
                 Cpp Projects/ and WebstormProjects/
```

`portfolio/` is a complete React + Vite site with its own tests, its own Playwright
suite and its own deployment story. It is the site the root of this repository
builds a different version of — see `docs/PROJECTS.md` §7.2 for why the root exists
and what it is for.

`archive/` holds two folders that have no README, no tests and no build. They are
recorded in `projects.json` as excluded, with that reason, rather than deleted:
they are the owner's work and removing them is the owner's decision, not tidying.
