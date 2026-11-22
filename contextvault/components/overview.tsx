'use client';
import { ArrowRight, BookOpen, Database, FileStack, MessageSquareText, Plus, Sparkles, Upload, MoreHorizontal, Layers3 } from 'lucide-react';
import { CollectionChip, DocumentName, FolderIcon, LinkButton, SectionTitle, Status } from './shared';
import { formatDate, type Collection, type Document, type WorkspaceData } from './types';

type Props={data:WorkspaceData; onUpload:()=>void; onChat:()=>void; onDocuments:()=>void; onCollections:()=>void; onCollection:(id:string)=>void; onDocument:(doc:Document)=>void; onCreate:()=>void; onArchitecture:()=>void};
export default function Overview({data,onUpload,onChat,onDocuments,onCollections,onCollection,onDocument,onCreate,onArchitecture}:Props) {
  const first=data.user.display_name.split(' ')[0];
  const cards=[
    {label:'Total documents', value:data.documents.filter(d=>!d.archived).length, hint:`Across ${data.collections.length} collections`, icon:<FileStack size={20}/>, tone:'purple'},
    {label:'Knowledge collections',value:data.collections.length,hint:'Your organized spaces',icon:<BookOpen size={20}/>,tone:'blue'},
    {label:'Conversations',value:data.conversations.length,hint:'Research threads',icon:<MessageSquareText size={20}/>,tone:'orange'},
    {label:'Indexed chunks',value:data.stats.chunks,hint:'Ready for retrieval',icon:<Database size={20}/>,tone:'green'},
  ];
  const recent=data.documents.filter(d=>!d.archived).slice(0,4);
  return <div className="page-content overview-page">
    <div className="page-heading"><div><div className="eyebrow-heading">YOUR WORKSPACE <span>✦</span></div><h1>Welcome back, {first} <span className="wave">✳</span></h1><p>Here&apos;s what&apos;s happening in your knowledge workspace.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={onCreate}><Plus size={16}/> New collection</button><button className="button button-primary" onClick={onUpload}><Upload size={16}/> Upload document</button></div></div>
    <section className="hero">
      <div className="hero-content"><span className="hero-kicker"><Sparkles size={13}/> YOUR AI RESEARCH ASSISTANT</span><h2>Turn information<br/>into insight.</h2><p>Ask questions across your documents and get answers grounded in the sources you trust.</p><div className="hero-actions"><button className="hero-button" onClick={onChat}>Start a conversation <ArrowRight size={16}/></button><button className="hero-link" onClick={onArchitecture}>See how it works <ArrowRight size={14}/></button></div></div>
      <div className="hero-corner"><span>✦</span> A CLEARER WAY TO THINK</div>
    </section>
    <div className="stat-grid">{cards.map(card=><div className="stat-card" key={card.label}><div className="stat-top"><span>{card.label}</span><span className={`stat-icon stat-${card.tone}`}>{card.icon}</span></div><div className="stat-value">{card.value}</div><div className="stat-hint">{card.hint}</div></div>)}</div>
    <div className="overview-grid">
      <section className="panel recent-panel"><SectionTitle title="Recent documents" description="Your knowledge, organized and ready." action={<LinkButton onClick={onDocuments}>View all</LinkButton>}/>
        {recent.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th scope="col">DOCUMENT</th><th scope="col">COLLECTION</th><th scope="col">STATUS</th><th scope="col">ADDED</th><th scope="col" aria-label="Actions"></th></tr></thead><tbody>{recent.map(doc=><tr key={doc.id} onClick={()=>onDocument(doc)} className="click-row"><td><DocumentName doc={doc}/></td><td><CollectionChip name={doc.collection_name} color={doc.collection_color}/></td><td><Status status={doc.status==='READY'&&doc.embedding_model&&doc.embedding_model!==data.config.embeddingProvider?'STALE':doc.status}/></td><td className="muted-cell">{formatDate(doc.created_at)}</td><td><button className="row-more" onClick={e=>{e.stopPropagation();onDocument(doc)}} aria-label={`Manage ${doc.filename}`}><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div> : <div className="inline-empty">No documents yet. <button onClick={onUpload}>Upload your first document</button></div>}
      </section>
      <section className="panel collections-panel"><SectionTitle title="Your collections" description="Keep your knowledge in context." action={<button className="small-icon-button" onClick={onCreate} aria-label="New collection"><Plus size={17}/></button>}/>
        <div className="collection-list">{data.collections.slice(0,4).map((c:Collection)=><button className="collection-list-item" key={c.id} onClick={()=>onCollection(c.id)}><FolderIcon color={c.color}/><span className="collection-list-copy"><strong>{c.name}</strong><small>{c.document_count} {c.document_count===1?'document':'documents'}</small></span><ArrowRight size={15}/></button>)}{!data.collections.length&&<div className="inline-empty">Create a collection to get started.</div>}</div>
        <button className="view-collections" onClick={onCollections}>View all collections <ArrowRight size={14}/></button>
      </section>
    </div>
    <div className="bottom-note"><div className="bottom-note-icon"><Layers3 size={18}/></div><div><strong>Built for more thoughtful answers</strong><span>See how your documents become grounded, cited knowledge.</span></div><button onClick={onArchitecture}>Explore the architecture <ArrowRight size={15}/></button></div>
  </div>;
}
