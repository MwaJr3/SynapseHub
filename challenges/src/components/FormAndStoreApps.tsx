import { useState } from 'react';
import type { ChallengeRecord } from '../manifest';

export function LocalDemoForm({ project }: { project: ChallengeRecord }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [notice, setNotice] = useState('');
  const reservation = project.slug === 'dine-restaurant-website';
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setNotice('');
    if (!name.trim()) { setNotice('Enter your name.'); return; }
    if (!email.includes('@') || email.endsWith('@')) { setNotice('Enter a valid email address.'); return; }
    if (reservation && (!date || !time || Number(guests) < 1)) { setNotice('Choose a date, time, and at least one guest.'); return; }
    setNotice(reservation ? `Demo preview: reservation details for ${name.trim()} are valid, but no booking was sent.` : `Demo preview: ${email.trim()} passes local validation. Nothing was sent or stored.`);
  };
  return <div className="app-tool-card"><form className="local-demo-form" onSubmit={submit}><p className="app-kicker">Local validation demo · not connected to a service</p><div className="app-two-columns"><label>Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={100} /></label><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>{reservation && <><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} required /></label><label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></label><label>Guests<input type="number" min="1" max="20" value={guests} onChange={(e) => setGuests(e.target.value)} /></label></>}</div><button className="app-button">{reservation ? 'Preview reservation request' : 'Validate local form'}</button></form>{notice && <p className="app-feedback" role="status">{notice}</p>}<p className="app-privacy-note">This is an interaction demo only. It does not submit to an API, send email, save contact details, or create a real booking.</p></div>;
}

interface Product { id: string; title: string; price: number }
interface CartLine { id: string; quantity: number }
function loadProducts(slug: string): Product[] { try { const data = JSON.parse(localStorage.getItem(`mwangala.products.${slug}`) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }

export function StoreApp({ project }: { project: ChallengeRecord }) {
  return project.slug === 'coffeeroasters-subscription-site' ? <CoffeePlan /> : <ProductCatalog project={project} />;
}

function ProductCatalog({ project }: { project: ChallengeRecord }) {
  const key = project.slug;
  const [products, setProducts] = useState<Product[]>(() => loadProducts(key));
  const [cart, setCart] = useState<CartLine[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const saveProducts = (next: Product[]) => { setProducts(next); try { localStorage.setItem(`mwangala.products.${key}`, JSON.stringify(next)); } catch { setMessage('Browser storage could not save the catalog.'); } };
  const addProduct = (event: React.FormEvent) => { event.preventDefault(); const cost = Number(price); if (!title.trim() || !(cost >= 0)) { setMessage('Enter a product name and a valid non-negative price.'); return; } saveProducts([{ id: crypto.randomUUID(), title: title.trim(), price: cost }, ...products]); setTitle(''); setPrice(''); setMessage('Product added to your local demo catalog.'); };
  const addToCart = (product: Product) => setCart((items) => { const found = items.find((item) => item.id === product.id); return found ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { id: product.id, quantity: 1 }]; });
  const total = cart.reduce((sum, line) => sum + (products.find((item) => item.id === line.id)?.price ?? 0) * line.quantity, 0);
  return <div className="app-workspace"><form className="app-entry-form app-entry-form--inline" onSubmit={addProduct}><label>Product name<input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Add a real item for your local catalog" /></label><label>Price<input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" /></label><button className="app-button">Add product</button></form>{message && <p className="app-feedback" role="status">{message}</p>}<div className="store-layout"><section><div className="app-form-heading"><div><p className="app-kicker">Your local catalog</p><h3>{products.length} product{products.length === 1 ? '' : 's'}</h3></div></div>{products.length ? <div className="store-products">{products.map((product) => <article key={product.id}><div><h4>{product.title}</h4><p>{product.price.toFixed(2)} · price entered by you</p></div><button className="app-button app-button--small" onClick={() => addToCart(product)}>Add to cart</button></article>)}</div> : <div className="app-empty-state"><span>＋</span><h3>No products added</h3><p>Add products and prices you have permission to use; no fictitious catalog is preloaded.</p></div>}</section><aside className="store-cart"><p className="app-kicker">Local cart</p><h3>{cart.reduce((sum, line) => sum + line.quantity, 0)} item(s)</h3>{cart.map((line) => { const item = products.find((product) => product.id === line.id); return item && <div key={line.id}><span>{item.title} × {line.quantity}</span><strong>{(item.price * line.quantity).toFixed(2)}</strong></div>; })}<p className="store-total">Total <strong>{total.toFixed(2)}</strong></p><button className="app-button" aria-describedby="checkout-hint" disabled={!cart.length} onClick={() => setMessage('Checkout preview only: no payment was processed and no order was placed.')}>Preview checkout</button><p className="app-small-note" id="checkout-hint">{cart.length ? 'Preview only: no payment is processed.' : 'Add a product to the cart to enable this preview.'}</p></aside></div><p className="app-privacy-note">Local shopping-cart prototype. No shipping, taxes, customer accounts, payment processor, or order backend is configured.</p></div>;
}

function CoffeePlan() {
  const [coffee, setCoffee] = useState('250g');
  const [grind, setGrind] = useState('Wholebean');
  const [frequency, setFrequency] = useState('Every 2 weeks');
  const [method, setMethod] = useState('Capsule');
  return <div className="app-tool-card"><p className="app-kicker">Subscription preference builder</p><h3>Choose your coffee preferences</h3><div className="coffee-options"><fieldset><legend>How do you drink your coffee?</legend>{['Capsule', 'Filter', 'Espresso'].map((item) => <label key={item}><input type="radio" name="method" checked={method === item} onChange={() => setMethod(item)} />{item}</label>)}</fieldset><fieldset><legend>Grind preference</legend>{['Wholebean', 'Filter grind', 'Cafetiere'].map((item) => <label key={item}><input type="radio" name="grind" checked={grind === item} onChange={() => setGrind(item)} />{item}</label>)}</fieldset><fieldset><legend>Bag size</legend>{['250g', '500g', '1kg'].map((item) => <label key={item}><input type="radio" name="coffee" checked={coffee === item} onChange={() => setCoffee(item)} />{item}</label>)}</fieldset><fieldset><legend>Delivery frequency</legend>{['Every week', 'Every 2 weeks', 'Every month'].map((item) => <label key={item}><input type="radio" name="frequency" checked={frequency === item} onChange={() => setFrequency(item)} />{item}</label>)}</fieldset></div><div className="coffee-summary"><span>Your selections</span><strong>{method} · {grind} · {coffee} · {frequency}</strong><small>Subscription price is not shown: no official price data was supplied.</small></div><p className="app-privacy-note">This configures a local preview only. It does not create a subscription or contact a roaster.</p></div>;
}
