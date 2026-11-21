// Fixture: planted keyboard, media and input-type defects, each next to a correct twin.
export function Gallery({ onOpen }: { onOpen: (id: number | null) => void }) {
  return (
    <section>
      {/* defect: no width/height, so the layout shifts when the photo arrives */}
      <img src="/harbour.jpg" alt="Harbour at dawn" />
      {/* correct twin */}
      <img src="/dock.jpg" alt="The dock" width="640" height="360" />

      {/* defect: a click target that keyboards cannot reach */}
      <div onClick={() => onOpen(1)}>Open photo</div>
      {/* correct twin: a real control */}
      <button onClick={() => onOpen(1)}>Open photo</button>
      {/* not a defect: a dimmed backdrop that dismisses on click */}
      <div className="overlay" onClick={() => onOpen(null)} />
      {/* not a defect: swallowing the click is not an action */}
      <div onClick={(event) => event.stopPropagation()}>Details</div>

      {/* defect: pulls this button to the front of the tab order */}
      <button tabIndex={3}>Share</button>
      {/* correct twin */}
      <button tabIndex={0}>Save</button>

      {/* defect: an email field that is a plain text field */}
      <input name="contact_email" aria-label="Contact email" />
      {/* correct twins */}
      <input type="email" name="email" aria-label="Email" />
      <input name="search" aria-label="Search photos" />
    </section>
  );
}
