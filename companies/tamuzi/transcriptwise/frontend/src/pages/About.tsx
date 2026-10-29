import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  Check,
  FileText,
  Layers,
  Lightbulb,
  Link2,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Youtube,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/ui'
import { ThemeMenu } from '../components/Shell'

export function About() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Product navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#made-for-learning">Made for learning</a>
          <Link to="/help">A little help</Link>
        </nav>
        <div>
          <ThemeMenu />
          <Link to="/new" className="button primary small">
            Open your workspace <ArrowRight size={14} />
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-eyebrow">
            <Sparkles size={14} /> LESS PASSIVE WATCHING. MORE POSSIBLE.
          </div>
          <h1>
            Turn YouTube videos into
            <br />
            knowledge you can <span>use.</span>
          </h1>
          <p>
            Find the important ideas. Understand the difficult ones.
            <br />
            Turn what you watch into something that stays with you.
          </p>
          <div className="button-row">
            <Link className="button primary" to="/new">
              Start a learning guide <ArrowRight size={17} />
            </Link>
            <Link className="button secondary" to="/new?sample=1">
              Try an example <ArrowUpRight size={16} />
            </Link>
          </div>
          <span className="landing-no-account">
            <Check size={12} />
            No account needed to try. Your curiosity is enough.
          </span>
          <div className="landing-flow">
            <div>
              <span className="flow-icon video">
                <Youtube size={29} />
              </span>
              <small>START WITH A SOURCE</small>
              <strong>A video worth your time.</strong>
              <p>
                A YouTube link, pasted transcript,
                <br />
                or a file you already have.
              </p>
              <div className="flow-inputs">
                <span>TXT</span>
                <span>SRT</span>
                <span>VTT</span>
              </div>
            </div>
            <span className="flow-arrow">
              <ArrowRight size={23} />
            </span>
            <div className="flow-center">
              <span className="flow-icon">
                <Sparkles size={29} />
              </span>
              <small>FIND A LITTLE CLARITY</small>
              <strong>Ideas that make sense.</strong>
              <p>
                Source-linked notes and concepts,
                <br />
                organized around your goals.
              </p>
              <div className="flow-concept">
                <Lightbulb size={12} />
                Aha. Now I get it.
              </div>
            </div>
            <span className="flow-arrow">
              <ArrowRight size={23} />
            </span>
            <div>
              <span className="flow-icon practice">
                <Brain size={29} />
              </span>
              <small>MAKE IT YOURS</small>
              <strong>Knowledge you can use.</strong>
              <p>
                Practice, apply, revisit.
                <br />
                Give the good ideas a place to stick.
              </p>
              <div className="flow-inputs">
                <span>
                  <ListChecks size={12} />
                  Quiz
                </span>
                <span>
                  <Layers size={12} />
                  Recall
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="landing-section">
          <div className="eyebrow">FROM “INTERESTING” TO “I UNDERSTAND”</div>
          <h2>A better next step after the play button.</h2>
          <p className="landing-section-description">
            A transcript is a starting point, not the destination. Build a learning experience around the
            source.
          </p>
          <div className="landing-features">
            {[
              [
                FileText,
                'Your source, in your control.',
                'Review and edit before analysis. Preserve the original and real timestamps. Never accept a sample in place of the video you requested.',
              ],
              [
                Lightbulb,
                'Understanding, not just less text.',
                'Choose your goal, explanation level, and depth. A configured AI provider can add explanations, relationships, and clearly labeled examples.',
              ],
              [
                ShieldCheck,
                'Keep a connection to the source.',
                'See what came from the speaker, what was added, and what you edited. Return to a cited passage instead of trusting an unsupported conclusion.',
              ],
            ].map(([Icon, title, body]) => {
              const ItemIcon = Icon as typeof FileText
              return (
                <article key={title as string}>
                  <ItemIcon size={24} />
                  <h3>{title as string}</h3>
                  <p>{body as string}</p>
                </article>
              )
            })}
          </div>
        </section>
        <section className="landing-example" id="made-for-learning">
          <div>
            <span className="eyebrow">A REAL EXAMPLE. NO MYSTERY SOURCE.</span>
            <h2>
              A small idea.
              <br />A useful next step.
            </h2>
            <p>
              This demonstration uses our authored “Learning how to learn” transcript. Open it in the
              workspace, inspect the source, and build your own guide.
            </p>
            <Link className="text-button" to="/new?sample=1">
              Explore the example <ArrowRight size={15} />
            </Link>
            <span className="example-caption">
              Local extractive mode is included without API keys. Full AI explanations require a configured
              language-model provider.
            </span>
          </div>
          <article className="example-guide">
            <div className="example-guide-top">
              <span className="example-guide-icon">
                <BookOpen size={21} />
              </span>
              <span>
                LEARNING HOW TO LEARN<small>Example learning material</small>
              </span>
              <span className="badge accent">EXAMPLE</span>
            </div>
            <div className="provenance-label">
              <span />
              SOURCE EXCERPT · 00:00
            </div>
            <h3>Start with active recall.</h3>
            <p>
              “Active recall is the practice of retrieving information from memory instead of simply rereading
              it.”
            </p>
            <div className="example-next-step">
              <span className="provenance-label added">
                <span />
                ADDITIONAL RECOMMENDATION
              </span>
              <strong>Close the page. Explain the idea.</strong>
              <p>
                Write a question about one source passage. Try to answer it without looking, then compare your
                answer to the source.
              </p>
            </div>
            <div className="example-guide-bottom">
              <Link2 size={12} />
              Source-linked. Clearly labeled. Ready to practice.
            </div>
          </article>
        </section>
        <section className="landing-truth">
          <ShieldCheck size={23} />
          <div>
            <h3>A useful tool starts with an honest one.</h3>
            <p>
              YouTube transcript retrieval depends on availability, authorization, and access permissions. The
              official captions API does not provide unrestricted access to every public video. Paste and file
              upload are always available. Source claims are not independently verified; external research is
              not enabled.
            </p>
          </div>
        </section>
        <section className="landing-cta">
          <span className="little-spark">
            <Sparkles size={26} />
          </span>
          <h2>Follow that little spark.</h2>
          <p>Your next good idea deserves more than a bookmark.</p>
          <Link className="button primary" to="/new">
            Make a little room to learn <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>Made for curious minds.</span>
        <Link to="/settings">
          Privacy & processing <ArrowUpRight size={13} />
        </Link>
      </footer>
    </div>
  )
}
