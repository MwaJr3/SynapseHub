'use client';
import { useEffect } from 'react';
import { Check, CheckCircle2, ChevronRight, FileText, LoaderCircle, X, AlertTriangle, UploadCloud } from 'lucide-react';
import type { Document } from './types';
import { ext, formatSize } from './types';

export function BrandMark({small=false}:{small?:boolean}) { return <span className={`brand-mark ${small?'brand-mark-small':''}`} aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="none"><path d="M12 3.1 3.8 7.8 12 12.5l8.2-4.7L12 3.1Z" fill="white"/><path d="m4.1 11.4 7.9 4.5 7.9-4.5M4.1 15.2l7.9 4.5 7.9-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; }
export function Modal({title,description,children,onClose,wide=false}:{title:string;description?:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}) {
  useEffect(()=>{ const fn=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()}; window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn); },[onClose]);
  return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose()}}><div role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide?'modal-wide':''}`}><div className="modal-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19}/></button></div>{children}</div></div>;
}
export function Status({status,progress}:{status:string;progress?:number}) {
  if (status==='READY') return <span className="status ready"><CheckCircle2 size={13}/> Ready</span>;
  if (status==='STALE') return <span className="status failed"><AlertTriangle size={13}/> Reprocess</span>;
  if (status==='FAILED') return <span className="status failed"><AlertTriangle size={13}/> Failed</span>;
  return <span className="status processing"><LoaderCircle size={13} className="spin"/> {status==='UPLOADED'?'Queued':status.charAt(0)+status.slice(1).toLowerCase()}{progress ? ` ${progress}%` : ''}</span>;
}
export function FileIcon({filename,large=false}:{filename:string;large?:boolean}) { const extension=ext(filename); return <span className={`file-icon file-${extension.toLowerCase()} ${large?'file-icon-large':''}`}><FileText size={large?22:18} strokeWidth={1.7}/><span>{extension==='MARKDOWN'?'MD':extension.slice(0,4)}</span></span>; }
export function FolderIcon({color='violet',large=false}:{color?:string;large?:boolean}) { return <span className={`folder-icon tone-${color} ${large?'folder-large':''}`}><svg width={large?24:18} height={large?24:18} viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg></span>; }
export function Empty({icon=<UploadCloud size={25}/>,title,description,action}:{icon?:React.ReactNode;title:string;description:string;action?:React.ReactNode}) { return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{action}</div>; }
export function CollectionChip({name,color}:{name:string;color:string}) { return <span className="collection-chip"><span className={`color-dot dot-${color}`}/>{name}</span>; }
export function DocumentName({doc}:{doc:Document}) { return <div className="document-name"><FileIcon filename={doc.filename}/><div className="truncate"><strong>{doc.filename}</strong><span>{ext(doc.filename)==='MD'?'Markdown':ext(doc.filename)} · {formatSize(doc.file_size)}</span></div></div>; }
export function SectionTitle({title,description,action}:{title:string;description?:string;action?:React.ReactNode}) { return <div className="section-title"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>; }
export function LinkButton({children,onClick}:{children:React.ReactNode;onClick:()=>void}) { return <button onClick={onClick} className="text-link">{children}<ChevronRight size={15}/></button>; }
export function CheckLine({children}:{children:React.ReactNode}) { return <span className="check-line"><Check size={14}/>{children}</span>; }
