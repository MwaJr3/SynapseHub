export function Accordion({ items }) {
  return items.map((item) => (
    <div key={item.id} className="accordion-item">
      <button onClick={() => toggle(item.id)}>{item.title}</button>
      <div>{item.body}</div>
    </div>
  ));
}
