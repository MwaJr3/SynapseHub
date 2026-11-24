import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  FileText,
  Folder,
  Grid2X2,
  Layers,
  Library as LibraryIcon,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Youtube,
} from 'lucide-react'
import { toast } from 'sonner'
import { patch, request } from '../lib/api'
import { useSession } from '../lib/session'
import { useAuthDialog } from '../lib/ui'
import { cx, dateLabel, message, useDebounce } from '../lib/utils'
import type { LibraryItem, LibraryResponse } from '../lib/types'
import { EmptyState, Notice, PageHeader, Spinner } from '../components/ui'
import { DeleteGuideDialog, ManageGuideDialog, useRefreshWorkspace } from '../components/GuideEditors'

export function Library() {
  const { session } = useSession()
  const openAuth = useAuthDialog()
  const refresh = useRefreshWorkspace()
  // Filters live in the address bar so a reload, back-navigation or shared link restores the same view.
  const [initial] = useState(() => new URLSearchParams(window.location.search))
  const [search, setSearch] = useState(initial.get('q') ?? '')
  const q = useDebounce(search)
  const [tab, setTab] = useState<'all' | 'saved'>(initial.get('tab') === 'saved' ? 'saved' : 'all')
  const [folder, setFolder] = useState(initial.get('folder') ?? '')
  const [tag, setTag] = useState(initial.get('tag') ?? '')
  const [source, setSource] = useState(initial.get('source') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? 'newest')
  useEffect(() => {
    const url = new URL(window.location.href)
    const wanted: Record<string, string> = { q: search, tab: tab === 'saved' ? 'saved' : '', folder, tag, source, sort: sort === 'newest' ? '' : sort }
    for (const [key, value] of Object.entries(wanted)) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(window.history.state, '', url)
  }, [search, tab, folder, tag, source, sort])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(0)
  const [managing, setManaging] = useState<LibraryItem | null>(null)
  const [deleting, setDeleting] = useState<LibraryItem | null>(null)
  const params = new URLSearchParams({ q, folder, tag, source, sort, limit: '12', offset: String(page * 12) })
  if (tab === 'saved') params.set('saved', 'true')
  const query = useQuery({
    queryKey: ['library', 'search', q, folder, tag, source, sort, tab, page],
    queryFn: () => request<LibraryResponse>(`/analyses?${params}`),
    refetchInterval: (query) =>
      query.state.data?.items.some((i) => ['queued', 'processing'].includes(i.status)) ? 1500 : false,
  })
  const clear = () => {
    setSearch('')
    setFolder('')
    setTag('')
    setSource('')
    setTab('all')
    setPage(0)
  }
  const save = async (item: LibraryItem) => {
    const run = async () => {
      try {
        await patch(`/analyses/${item.id}`, { revision: item.revision, is_saved: !item.is_saved })
        refresh()
        toast.success(item.is_saved ? 'Removed from saved guides.' : 'Saved to your library.')
      } catch (e) {
        toast.error(message(e))
      }
    }
    if (session.user.is_guest) openAuth('register', run)
    else run()
  }
  const isFiltered = !!(q || folder || tag || source || tab === 'saved')
  return (
    <div className="workspace-page library-page">
      <PageHeader
        eyebrow="MAKE ROOM FOR WHAT MATTERS"
        title="A home for your good ideas."
        description="Everything you’ve explored, ready for your next connection."
        action={
          <Link className="button primary" to="/new">
            <Plus size={16} />
            New learning guide
          </Link>
        }
      />
      {session.user.is_guest && (
        <div className="guest-banner">
          <div className="guest-banner-icon">
            <BookMarkIcon />
          </div>
          <div>
            <strong>A little more permanent. A lot more you.</strong>
            <p>
              Your guest guides are kept for {session.capabilities.guest_retention_days} days. Create an
              account, then save the ones you want to keep.
            </p>
          </div>
          <button className="text-button" onClick={() => openAuth('register')}>
            Create an account <ArrowRight size={14} />
          </button>
        </div>
      )}
      <div className="library-tabs">
        <div role="tablist" aria-label="Library view">
          <button
            role="tab"
            aria-selected={tab === 'all'}
            onClick={() => {
              setTab('all')
              setPage(0)
            }}
          >
            All guides
          </button>
          <button
            role="tab"
            aria-selected={tab === 'saved'}
            onClick={() => {
              setTab('saved')
              setPage(0)
            }}
          >
            <Bookmark size={13} />
            Saved
          </button>
        </div>
        <span className="muted">
          {query.data?.total ?? '—'} {query.data?.total === 1 ? 'guide' : 'guides'}
        </span>
      </div>
      <div className="library-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            type="search"
            aria-label="Search your library"
            placeholder="Search titles, notes, topics, and tags…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
          {search && (
            <button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="library-filters">
          <label className="select-with-icon">
            <Folder size={14} />
            <span className="sr-only">Filter by folder</span>
            <select
              value={folder}
              onChange={(e) => {
                setFolder(e.target.value)
                setPage(0)
              }}
            >
              <option value="">All folders</option>
              {query.data?.folders.map((folder) => (
                <option key={folder}>{folder}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by source</span>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                setPage(0)
              }}
            >
              <option value="">All sources</option>
              <option value="paste">Pasted text</option>
              <option value="upload">Uploaded files</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort guides</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(0)
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
          <div className="view-toggle" aria-label="Library layout">
            <button
              className={cx(view === 'grid' && 'active')}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <Grid2X2 size={16} />
            </button>
            <button
              className={cx(view === 'list' && 'active')}
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
      {!!query.data?.tags.length && (
        <div className="library-tags">
          <span>Explore a tag</span>
          {query.data.tags.slice(0, 12).map((value) => (
            <button
              key={value}
              className={cx('tag-filter', tag === value && 'selected')}
              onClick={() => {
                setTag(tag === value ? '' : value)
                setPage(0)
              }}
            >
              #{value}
              {tag === value && <X size={10} />}
            </button>
          ))}
        </div>
      )}
      {query.isPending ? (
        <Spinner label="Finding your good ideas…" />
      ) : query.isError ? (
        <Notice
          variant="error"
          action={
            <button className="button secondary small" onClick={() => query.refetch()}>
              Try again
            </button>
          }
        >
          {query.error.message}
        </Notice>
      ) : !query.data.items.length ? (
        <EmptyState
          icon={isFiltered ? <Search size={30} /> : <LibraryIcon size={32} />}
          title={
            isFiltered ? 'No guides found. New directions, perhaps?' : 'Your next discovery starts here.'
          }
          description={
            isFiltered
              ? 'Try another search, choose a different folder, or clear your filters to see all of your guides.'
              : 'Turn a transcript into your first learning guide. It will be right here when you want to revisit, organize, or keep learning.'
          }
          action={
            isFiltered ? (
              <button className="button secondary" onClick={clear}>
                Clear search & filters
              </button>
            ) : (
              <Link className="button primary" to="/new?method=paste">
                Create your first guide <ArrowRight size={16} />
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className={cx('library-results', view)}>
            {query.data.items.map((item, i) => (
              <article className="library-card" key={item.id}>
                <div className="library-card-top">
                  <div className={`document-icon tint-${i % 4}`}>
                    {item.source_type === 'youtube' ? <Youtube size={23} /> : <FileText size={23} />}
                  </div>
                  <div className="library-card-badges">
                    <span
                      className={cx(
                        'badge',
                        item.status === 'complete'
                          ? 'neutral'
                          : item.status === 'failed' || item.status === 'partial'
                            ? 'warning'
                            : 'accent',
                      )}
                    >
                      {item.status === 'complete'
                        ? 'Ready to explore'
                        : item.status === 'failed'
                          ? 'Needs a retry'
                          : item.status === 'partial'
                            ? 'Partial guide'
                            : 'Processing'}
                    </span>
                    <details className="dropdown">
                      <summary className="icon-button" aria-label={`Options for ${item.title}`}>
                        <MoreHorizontal size={18} />
                      </summary>
                      <div className="dropdown-menu">
                        <button
                          onClick={(e) => {
                            e.currentTarget.closest('details')!.open = false
                            setManaging(item)
                          }}
                        >
                          <Pencil size={14} />
                          Rename & organize
                        </button>
                        <button
                          disabled={['queued', 'processing'].includes(item.status)}
                          onClick={() => save(item)}
                        >
                          {item.is_saved ? <Check size={14} /> : <Bookmark size={14} />}
                          {item.is_saved ? 'Remove from saved' : 'Save guide'}
                        </button>
                        <button
                          className="danger-text"
                          onClick={(e) => {
                            e.currentTarget.closest('details')!.open = false
                            setDeleting(item)
                          }}
                        >
                          <Trash2 size={14} />
                          Delete guide
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
                <div className="library-card-main">
                  <div className="library-source">
                    {item.source_type === 'youtube'
                      ? 'YOUTUBE VIDEO'
                      : item.source_type === 'upload'
                        ? 'UPLOADED TRANSCRIPT'
                        : 'PASTED TRANSCRIPT'}
                    {item.is_saved && <Bookmark size={11} fill="currentColor" />}
                  </div>
                  <h2>
                    <Link to={`/guide/${item.id}`}>{item.title}</Link>
                  </h2>
                  <div className="card-organizing">
                    {item.folder && (
                      <span>
                        <Folder size={11} />
                        {item.folder}
                      </span>
                    )}
                    {item.tags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setTag(tag)
                          setPage(0)
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="library-card-footer">
                  <span>
                    {dateLabel(item.created_at)} <span className="dot-separator">·</span> {item.section_count}{' '}
                    sections
                    {item.card_count > 0 && (
                      <>
                        <span className="dot-separator">·</span>
                        <Layers size={11} />
                        {item.card_count}
                      </>
                    )}
                  </span>
                  <Link to={`/guide/${item.id}`} aria-label={`Open ${item.title}`}>
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {query.data.total > 12 && (
            <div className="pagination">
              <button
                className="button secondary small"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {Math.ceil(query.data.total / 12)}
              </span>
              <button
                className="button secondary small"
                disabled={(page + 1) * 12 >= query.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      <p className="library-retention">
        <Check size={12} />
        Saved guides stay until you delete them. Unsaved account guides are kept for{' '}
        {session.capabilities.unsaved_retention_days} days after their last edit. Guest workspaces expire
        after {session.capabilities.guest_retention_days} days.
      </p>
      {managing && <ManageGuideDialog guide={managing} open onClose={() => setManaging(null)} />}
      {deleting && <DeleteGuideDialog guide={deleting} open onClose={() => setDeleting(null)} />}
    </div>
  )
}
function BookMarkIcon() {
  return <Bookmark size={20} />
}
