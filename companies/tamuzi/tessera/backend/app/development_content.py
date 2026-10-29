"""Stage 7 content: the learner-development curriculum, as data.

The master prompt (Part I) asks for a curriculum that covers five learning
dimensions, five learning processes and nine technique groups (A-I), and it is
explicit about two things that shape this file:

**Nothing may be silently omitted.** Every topic the document lists appears here
exactly once, attached to exactly one lesson. `tests/test_development.py` asserts
that partition, so a topic cannot be dropped by editing a lesson list without a
red test — which is the only way "all topics covered" stays true as this file grows.

**Named methods are not to be invented.** Nine methods in the source material have
names and no supplied definitions (AIM, Bear Hunter System, VPReFRE criteria,
GRINDE maps, PEER-Peer, OFF-rest timing, the survive-and-thrive filter, order
control, the Huddle framework). They are recorded in `NAMED_METHODS` with
`status="undefined"`, the learning problem each one presumably addresses, and an
independently supported alternative. There is no `definition` field, because a
definition would be a fabrication; the API refuses to describe them as anything
other than undefined, and a test enforces that the field never appears.

Lessons are deliberately grouped. The document permits it — "group tightly related
ideas when useful" — and twenty-four lessons that each carry the full required
shape (model, when to use, when not to, worked example, exercise, judging results,
traps, retrieval check) are more teachable than seventy-three fragments.
"""

from __future__ import annotations

from typing import TypedDict


# --------------------------------------------------------------------- dimensions
#
# The five dimensions and their training targets, taken from the document. A
# dimension is not a score here: `reported` is what the instrument supplied, and
# `None` means the instrument never reported one — which includes self-management,
# whose baseline is behavioural and must never be turned into a percentage.


class Dimension(TypedDict):
    key: str
    name: str
    reported: int | None
    goal: str
    practices: list[str]
    drill: str
    caution: str


DIMENSIONS: tuple[Dimension, ...] = (
    {
        "key": "mindset",
        "name": "Mindset",
        "reported": 84,
        "goal": "Evidence-sensitive persistence, not indiscriminate positivity.",
        "practices": [
            "Respond constructively to mistakes and setbacks.",
            "Separate task performance from personal worth or identity.",
            "Experiment under uncertainty.",
            "Tolerate temporary incompetence while acquiring a skill.",
            "Recognise perfectionism, avoidance and unhelpful self-talk.",
            "Build confidence from demonstrated competence rather than unsupported affirmation.",
            "Analyse mistakes without turning reflection into self-criticism.",
            "Choose a next action after a setback.",
        ],
        "drill": (
            "After one failed attempt this week, write two lines: what the attempt "
            "produced as evidence, and the single next action. No verdict on yourself."
        ),
        "caution": (
            "These exercises are not a diagnostic tool. Do not infer a psychological "
            "condition from them, and do not treat a high reported score as proof of "
            "resilience under real pressure."
        ),
    },
    {
        "key": "self_regulation",
        "name": "Self-regulation",
        "reported": 80,
        "goal": "Monitor and change method on evidence, not on mood.",
        "practices": [
            "Notice comprehension while learning.",
            "Distinguish recognition, confidence, recall and application.",
            "Monitor study methods and their results.",
            "Use low-cost experiments to compare techniques.",
            "Track delayed performance, error patterns and transfer.",
            "Change strategy when the evidence warrants it.",
            "Conduct weekly learning audits and monthly reviews.",
            "Build self-coaching skills rather than dependence on the assistant.",
        ],
        "drill": (
            "Once a week, name the method you used, the evidence it produced, and one "
            "thing you will change. Record it even when nothing changes."
        ),
        "caution": (
            "A weekly audit that becomes a performance review of yourself has stopped "
            "doing its job; it should judge the method, never the person."
        ),
    },
    {
        "key": "deep_processing",
        "name": "Deep processing",
        "reported": 73,
        "goal": "Build explanations that survive being questioned.",
        "practices": [
            "Elaborate ideas in your own words.",
            "Identify causal mechanisms and assumptions.",
            "Compare and contrast related concepts.",
            "Build mental models and conceptual hierarchies.",
            "Connect concrete examples to abstract principles.",
            "Explain when an analogy helps and where it breaks.",
            "Find relationships across subjects.",
            "Generate counterexamples, boundary cases and implications.",
            "Move between verbal, visual, mathematical and procedural representations.",
        ],
        "drill": (
            "Take one idea you think you understand. Write its mechanism, one "
            "counterexample, and where an analogy for it stops working."
        ),
        "caution": (
            "Fluency while reading is not understanding. If you cannot produce the "
            "mechanism with the page closed, the elaboration has not happened yet."
        ),
    },
    {
        "key": "retrieval",
        "name": "Retrieval",
        "reported": 43,
        "goal": "Produce knowledge without support, and keep what survives.",
        "practices": [
            "Practise free recall, cued recall, short answers and recognition appropriately.",
            "Explain concepts from memory without notes.",
            "Reconstruct diagrams, procedures, arguments and problem solutions.",
            "Schedule retrieval across time rather than cramming into one session.",
            "Use interleaving when it improves discrimination or transfer.",
            "Correct errors after retrieval and later retest them.",
            "Practise under realistic time or performance constraints when relevant.",
            "Use flashcards selectively, alongside blank-page recall, explanation and teaching.",
        ],
        "drill": (
            "Blank page, five minutes, one topic: write everything, then check against "
            "the source and mark what you produced from memory."
        ),
        "caution": (
            "The lowest reported score is the easiest one to over-train. Retrieval "
            "practice that never gets checked becomes rehearsal of your own errors."
        ),
    },
    {
        "key": "self_management",
        "name": "Self-management",
        #: Never supplied. The document requires a behavioural baseline instead, and
        #: says in as many words: "without inventing a percentage".
        "reported": None,
        "goal": "A described baseline: when you start, what interrupts you, how you resume.",
        "practices": [
            "Assess planning and prioritisation.",
            "Assess starting and finishing tasks.",
            "Assess procrastination and distraction.",
            "Assess session design, context switching and decision fatigue.",
            "Assess available time, energy, sleep, recovery and competing responsibilities.",
            "Assess consistency, workload realism, and the ability to resume after interruption.",
            "Create a behavioural baseline without inventing a percentage.",
        ],
        "drill": (
            "Complete the self-management baseline: nine self-report items plus one "
            "timed observation task. It produces a description and counts, never a score."
        ),
        "caution": (
            "No percentage is computed here, by design. A number would imply a "
            "measurement that never took place."
        ),
    },
)


# ---------------------------------------------------------------------- processes


class Process(TypedDict):
    key: str
    name: str
    reported: int | None
    trains: str
    drill: str
    fails_when: str


PROCESSES: tuple[Process, ...] = (
    {
        "key": "priming",
        "name": "Priming",
        "reported": 75,
        "trains": (
            "Activating prior knowledge, previewing structure, establishing a question, "
            "checking prerequisites, spotting what matters, reducing avoidable overload."
        ),
        "drill": "Six minutes, timer visible: what do I already know, what is this for, what do I need first?",
        "fails_when": (
            "It has no time budget and becomes preparation as procrastination — "
            "reorganising notes instead of starting."
        ),
    },
    {
        "key": "encoding",
        "name": "Encoding",
        "reported": 69,
        "trains": (
            "Meaning construction, explanatory elaboration, organisation, examples, "
            "relationship mapping, worked-example analysis, note-making that is written "
            "for a question you will ask later."
        ),
        "drill": "Explain the mechanism in your own words to an imagined reader, then find the sentence you cannot defend.",
        "fails_when": (
            "Fluent reading is mistaken for understanding; the page feels familiar and "
            "the mechanism was never built."
        ),
    },
    {
        "key": "reference",
        "name": "Reference",
        #: The diagnostic reported 0%. A real supplied zero, not a missing value.
        "reported": 0,
        "trains": (
            "Deciding what is worth capturing for later lookup, what must be learned "
            "rather than stored, and what need not be saved at all. Concise notes, "
            "source attribution, definitions, mechanisms, examples, exceptions, "
            "evidence, deduplication, linking, searchability."
        ),
        "drill": "Write one note whose purpose is to answer a specific future question, then try to answer it from the note alone.",
        "fails_when": (
            "Notes grow in volume and are never used. The test is whether a note "
            "supports later retrieval and application, not how much it contains."
        ),
    },
    {
        "key": "retrieval_interleaving",
        "name": "Retrieval and interleaving",
        "reported": 43,
        "trains": (
            "An explicit approach per material type: factual, conceptual, comparative "
            "and application-heavy. When recognition, recall, cued prompts, free "
            "response, problem reconstruction, mixed practice and spaced review each fit."
        ),
        "drill": "Pick one topic and produce it four ways: recognition, recall, explanation, application.",
        "fails_when": (
            "Interleaving is forced where blocked practice is needed for first "
            "instruction or for a procedure that is unsafe to mix yet."
        ),
    },
    {
        "key": "overlearning",
        "name": "Overlearning",
        "reported": 33,
        "trains": (
            "Selective extra rehearsal for automaticity, speed, fluency, performance "
            "under pressure and high-stakes procedures — after encoding and retrieval "
            "are already adequate."
        ),
        "drill": "Name one skill worth automating and one that is not; say what the second would cost.",
        "fails_when": (
            "It is applied before the material is understood, or applied everywhere and "
            "spends the time that the next topic needed."
        ),
    },
)


# ------------------------------------------------------------------------- topics
#
# Every topic named under groups A-I in the document, keyed. `LESSONS` must
# partition this exactly; the test asserts it in both directions.

TOPICS: dict[str, tuple[tuple[str, str], ...]] = {
    "A": (
        ("a_time", "Sustainable time management and scheduling"),
        ("a_procrastination", "Reducing procrastination with task shaping, prompts and implementation intentions"),
        ("a_growth_zone", "Entering an appropriately challenging growth zone"),
        ("a_session", "Designing a productive session with a clear objective and stopping condition"),
        ("a_routine", "Maintaining a minimum viable learning routine during busy periods"),
    ),
    "B": (
        ("b_spacing", "The spacing effect and spacing schedules"),
        ("b_schedule_choice", "Retrieval scheduling from performance, importance, deadline and elapsed time"),
        ("b_interleaving", "Declarative versus procedural interleaving"),
        ("b_recognition", "Recognition versus recall, and when each is appropriate"),
        ("b_time_constraint", "Retrieval under time constraints"),
        ("b_marginal", "Marginal gains: one high-value improvement at a time"),
        ("b_prompts", "Prompt design, error correction and delayed retesting"),
        ("b_card_triage", "Flashcard triage to remove redundant or low-value cards"),
    ),
    "C": (
        ("c_priming", "Prestudy and priming"),
        ("c_live", "Learning during lectures, seminars, classes and live explanations"),
        ("c_notes", "Effective note-taking and reference capture"),
        ("c_memorisation", "High-yield memorisation"),
        ("c_scheduling", "Scheduling encoding and retrieval sessions"),
        ("c_mechanism", "Explaining mechanisms and resolving misconceptions"),
        ("c_exams", "Preparation for written and oral examinations"),
    ),
    "D": (
        ("d_formation", "Habit formation: cues, routines and reliable triggers"),
        ("d_unlearning", "Unlearning habits that make learning less effective"),
        ("d_intentions", "Implementation intentions and environment design"),
        ("d_slips", "Handling slips without abandoning the system"),
        ("d_perfectionism", "Perfectionism and the all-or-nothing trap"),
        ("d_measure", "Measuring whether a habit improves outcomes, not only streak length"),
    ),
    "E": (
        ("e_decay", "Knowledge decay and choosing what deserves maintenance"),
        ("e_filter", "Survive-and-thrive filtering as a source-named technique requiring definition"),
        ("e_inquiry", "Inquiry-based learning and question-led focus"),
        ("e_order", "Order control and sequencing as source-named techniques requiring definition"),
        ("e_chunking", "Conceptual chunking and the limits of overcompression"),
        ("e_maps", "Mind mapping for relationships, not decoration"),
        ("e_map_testing", "Rapid self-testing from maps or diagrams"),
        ("e_integration", "Integrating concepts across domains"),
    ),
    "F": (
        ("f_prioritise", "Prioritisation under deadlines and incomplete information"),
        ("f_attention", "Attention management and reducing context switching"),
        ("f_load", "Managing cognitive load and overload"),
        ("f_flow", "Focus, flow and suitable rest intervals"),
        ("f_energy", "Energy-aware planning and protecting recovery"),
        ("f_overhead", "Avoiding productivity systems that cost more time than they save"),
    ),
    "G": (
        ("g_cards", "Flashcard selection, pruning and review management"),
        ("g_loci", "The method of loci and when spatial mnemonics may be appropriate"),
        ("g_detail", "Memorising detailed material without replacing understanding"),
        ("g_rote", "Correct and incorrect uses of rote memorisation"),
        ("g_limits", "Ethical and safe limits when memorising clinical, technical or high-stakes procedures"),
    ),
    "H": (
        ("h_wpw", "Whole-Part-Whole reteaching"),
        ("h_self_explain", "Self-explanation and teaching a concept clearly"),
        ("h_multilevel", "Multilevel conceptual recall"),
        ("h_reconstruct", "Reconstructing a complex system or argument from memory"),
        ("h_transfer", "Integration across topics and transfer to unfamiliar problems"),
        ("h_reasoning", "Identifying reasoning errors and correcting the underlying model"),
    ),
    "I": (
        ("i_cramming", "The trade-offs and limits of cramming"),
        ("i_multipass", "Multi-pass methods for complex material or restricted time"),
        ("i_next_action", "Choosing the next best action when time is scarce"),
        ("i_exam_execution", "Exam execution: question interpretation, pacing and checking"),
        ("i_silly_errors", "Reducing avoidable or 'silly' errors"),
        ("i_efficiency", "Evaluating efficiency by delayed outcomes, not time alone"),
        ("i_defer", "Deciding what not to learn and what can safely be deferred"),
    ),
}

TOPIC_TITLES: dict[str, str] = {key: title for group in TOPICS.values() for key, title in group}

GROUP_TITLES: dict[str, str] = {
    "A": "Rapid-start learning",
    "B": "Retrieval system design",
    "C": "Encoding and learning environments",
    "D": "Habit development",
    "E": "Memory and knowledge organisation",
    "F": "Advanced self-management",
    "G": "Memorisation",
    "H": "Higher-order retrieval",
    "I": "Learning-system optimisation",
}


# ------------------------------------------------------------------------ lessons


class Lesson(TypedDict):
    slug: str
    title: str
    group: str
    topics: tuple[str, ...]
    model: str
    when_to_use: str
    when_not_to_use: str
    worked_example: str
    exercise: str
    judging_results: str
    traps: str
    retrieval_check: tuple[str, tuple[str, ...]]


LESSONS: tuple[Lesson, ...] = (
    # ---------------------------------------------------------------- A
    {
        "slug": "starting-and-keeping-a-routine",
        "title": "Starting, and keeping a routine alive",
        "group": "A",
        "topics": ("a_time", "a_procrastination", "a_routine"),
        "model": (
            "Procrastination is usually a property of the task as shaped, not of the "
            "person: the next action is too big, or too vague, to begin. Shaping it into "
            "a first step you could do in two minutes, attached to a cue that already "
            "exists, removes the decision — and decisions are the expensive part."
        ),
        "when_to_use": "Starting anything you have postponed twice, and rebuilding after a disrupted week.",
        "when_not_to_use": (
            "When the task is genuinely the wrong task. A better cue for work you should "
            "not be doing is an efficient way to waste a month."
        ),
        "worked_example": (
            "\"Revise statistics\" becomes \"open the chapter 4 problem set and copy the "
            "first question onto paper, at 19:00, at the kitchen table, after the plates "
            "are cleared\". The cue is the cleared table; the first step needs no judgement."
        ),
        "exercise": (
            "Take one postponed task. Write the two-minute first step, the cue that "
            "triggers it, and the smallest version of the session you would still count "
            "as having happened on a bad day."
        ),
        "judging_results": (
            "Count starts per week and the minutes from cue to first action. A routine "
            "that survives your worst week is working; one that only survives good weeks "
            "is a fair-weather schedule."
        ),
        "traps": (
            "Building the minimum viable routine out of optimism; treating a missed day "
            "as evidence that the routine failed rather than that it was too large."
        ),
        "retrieval_check": (
            "Why does a two-minute first step work when a 90-minute session does not?",
            (
                "Names that the barrier is starting (decision and task size), not capacity",
                "Connects it to a cue or implementation intention",
                "Mentions that the session still needs an objective and a stopping condition",
            ),
        ),
    },
    {
        "slug": "growth-zone-and-session-design",
        "title": "The growth zone, and what makes a session a session",
        "group": "A",
        "topics": ("a_growth_zone", "a_session"),
        "model": (
            "Difficulty has a productive band: hard enough that retrieval is effortful, "
            "easy enough that success is frequent. A session earns the name by declaring "
            "an objective and a stopping condition before it starts, so it ends because "
            "it is finished rather than because attention ran out."
        ),
        "when_to_use": "Every deliberate session; especially when choosing what to work on next.",
        "when_not_to_use": (
            "For first exposure to a procedure where errors are unsafe. Blocked practice "
            "at low difficulty is correct there, and the growth zone waits."
        ),
        "worked_example": (
            "Objective: \"explain the mechanism of demand paging without notes\". "
            "Stopping condition: \"twenty minutes, or one uninterrupted explanation, "
            "whichever comes first\". Difficulty chosen so the first attempt likely fails "
            "partway — which is the useful outcome, not a setback."
        ),
        "exercise": (
            "Write tomorrow's session as an objective, a stopping condition and a "
            "difficulty estimate. Afterwards, record whether the difficulty was right."
        ),
        "judging_results": (
            "If you succeeded without effort, the difficulty was below the band. If you "
            "could not start producing anything, it was above it. Adjust one notch."
        ),
        "traps": (
            "Objectives that describe activity (\"revise chapter 3\") rather than "
            "production; stopping conditions that are clock-only when the work is not "
            "time-shaped."
        ),
        "retrieval_check": (
            "What are the two things a session must declare before it starts, and why?",
            (
                "Objective stated as something produced, not an activity",
                "Stopping condition stated in advance",
                "Gives a reason: the session ends on completion, not on exhaustion",
            ),
        ),
    },
    # ---------------------------------------------------------------- B
    {
        "slug": "spacing-and-when-to-review",
        "title": "Spacing, and choosing when to review",
        "group": "B",
        "topics": ("b_spacing", "b_schedule_choice"),
        "model": (
            "Memory strengthens more when retrieval happens after forgetting has begun "
            "than while the material is still fresh. Spacing is therefore not a "
            "convenience — the gap is the mechanism. But the right gap depends on why "
            "you are reviewing: a deadline, an exam date, or a decay risk."
        ),
        "when_to_use": "Any material you intend to keep beyond the week you learned it.",
        "when_not_to_use": (
            "Immediately before first understanding. Spacing something you never "
            "encoded just schedules confusion at intervals."
        ),
        "worked_example": (
            "A procedure learned Monday with an assessment in six weeks: first retrieval "
            "Wednesday, second in eight days, then stretched while each success holds. "
            "A high-importance concept due in three weeks gets shorter gaps than a "
            "low-importance one with no deadline."
        ),
        "exercise": (
            "Take three things you learned this week. Give each a next retrieval date and "
            "one sentence saying which of performance, importance, deadline or elapsed "
            "time set it."
        ),
        "judging_results": (
            "Track recall at each interval. Success at a stretched interval is evidence "
            "the gap was right; failure twice at the same interval says the gap was too long."
        ),
        "traps": (
            "Reviewing on a fixed weekly grid regardless of the material; letting the app "
            "or the calendar own a decision you should be able to explain."
        ),
        "retrieval_check": (
            "Name the four things that should change how soon you review something.",
            (
                "Performance on the last retrieval",
                "Importance of the material",
                "Deadline or assessment date",
                "Time elapsed since the last successful retrieval",
            ),
        ),
    },
    {
        "slug": "interleaving-recognition-and-time",
        "title": "Interleaving, recognition, and practice under the clock",
        "group": "B",
        "topics": ("b_interleaving", "b_recognition", "b_time_constraint"),
        "model": (
            "Interleaving mixes two similar things so that telling them apart becomes the "
            "work. It helps declarative material where discrimination is the difficulty, "
            "and helps procedural material when the choice of procedure is the skill. "
            "Recognition is a weaker test than recall and is only appropriate when the "
            "real task is recognising."
        ),
        "when_to_use": "Once each item is understood separately and the confusion between them is the problem.",
        "when_not_to_use": (
            "During first instruction, or when a procedure must be executed safely and "
            "consistently. Blocked practice builds the unit; interleaving tests it."
        ),
        "worked_example": (
            "Two statistical tests with similar assumptions: blocking teaches each one, "
            "then interleaving presents unlabelled problems so choosing becomes the skill. "
            "A timed set follows only once choice is reliable, because speed is tested last."
        ),
        "exercise": (
            "Build a ten-item mix from two topics you keep confusing. Do it once untimed "
            "and once timed; note whether errors are of choice or of execution."
        ),
        "judging_results": (
            "Errors of choice mean the discrimination is not built; errors of execution "
            "mean it is built but not automatic. Those need different practice."
        ),
        "traps": (
            "Confusing the discomfort of interleaving with evidence that it is working; "
            "adding a timer before the choice is reliable and recording the resulting "
            "panic as a comprehension problem."
        ),
        "retrieval_check": (
            "When is recognition the right test, and when is it a way of avoiding the test?",
            (
                "Recognition is right when the real task is recognising",
                "It is a way of avoiding the test when the real task is producing",
                "Says recall should be the default once the material is known at all",
            ),
        ),
    },
    {
        "slug": "prompts-cards-and-one-change",
        "title": "Prompts, cards, and one change at a time",
        "group": "B",
        "topics": ("b_prompts", "b_marginal", "b_card_triage"),
        "model": (
            "A prompt should demand production, not recognition, unless recognition is the "
            "target. Every error found by retrieval gets corrected and then retested later, "
            "or it is being rehearsed. Cards that have become trivial or that duplicate "
            "another are removed, because cheap cards are how a deck becomes unmaintainable."
        ),
        "when_to_use": "Reviewing a deck, designing prompts, and choosing what to improve next.",
        "when_not_to_use": (
            "Changing several parts of your method at once. Then no result tells you which "
            "change did anything."
        ),
        "worked_example": (
            "A card reading \"Define osmosis\" is rewritten as \"A cell is placed in "
            "distilled water — explain what happens to it, and why\". Six duplicated cards "
            "are deleted. One change this fortnight: prompt quality, not card count."
        ),
        "exercise": (
            "Audit twenty cards: mark each as recall, recognition or unclear; rewrite the "
            "unclear ones; delete the duplicates. Pick exactly one further change to test."
        ),
        "judging_results": (
            "Compare delayed performance on the rewritten cards against the untouched ones "
            "two weeks later. Improvement on prompts that were not changed is not "
            "attributable to the change."
        ),
        "traps": (
            "Improving everything simultaneously and crediting the improvement; keeping a "
            "card because it took effort to make, which is sunk cost with a nicer name."
        ),
        "retrieval_check": (
            "Why does an error found by retrieval have to be retested later?",
            (
                "Correction alone does not replace the original trace",
                "It only becomes evidence once it survives a later, unsupported retrieval",
            ),
        ),
    },
    # ---------------------------------------------------------------- C
    {
        "slug": "priming-and-scheduling-sessions",
        "title": "Priming with a time box, and scheduling the two halves",
        "group": "C",
        "topics": ("c_priming", "c_scheduling"),
        "model": (
            "Priming works when it ends: a few minutes to activate prior knowledge, name a "
            "question and check prerequisites. Encoding and retrieval are separate "
            "sessions in a well-run week, because doing them together hides which one is "
            "producing the result."
        ),
        "when_to_use": "Before new material, and when a week's plan is being laid out.",
        "when_not_to_use": (
            "As a substitute for starting. If priming has run past its budget twice, it is "
            "the work you are avoiding."
        ),
        "worked_example": (
            "Six minutes with a visible timer: three things I already know about "
            "inflation, one question this reading should answer, one thing I need first. "
            "Then the reading. The retrieval session is on Thursday, not at the end of "
            "the reading."
        ),
        "exercise": (
            "Prime for six minutes before your next study block and write the question. "
            "Book the retrieval session for a different day before you begin."
        ),
        "judging_results": (
            "The test of priming is whether the subsequent session started faster and "
            "produced better questions — not whether the priming felt productive."
        ),
        "traps": (
            "Priming without a timer; scheduling encoding and retrieval in the same sitting "
            "and then wondering why nothing survives a week."
        ),
        "retrieval_check": (
            "What are the three outputs of a priming session, and what bounds it?",
            (
                "Prior knowledge activated, a question to answer, prerequisites checked",
                "A time box, so it cannot become preparation",
            ),
        ),
    },
    {
        "slug": "lectures-and-notes",
        "title": "Live explanations, and notes worth keeping",
        "group": "C",
        "topics": ("c_live", "c_notes"),
        "model": (
            "In a live explanation you cannot pause the speaker, so the useful activity is "
            "capturing questions and structure, not transcription. A reference note earns "
            "its place by answering a question someone will ask later; if it cannot answer "
            "one, it is a souvenir."
        ),
        "when_to_use": "Lectures, seminars, tutorials and any explanation delivered at someone else's pace.",
        "when_not_to_use": (
            "When the material is recorded and you will rewatch it. Then the live note is "
            "duplicated, and the rewatch is better spent doing retrieval."
        ),
        "worked_example": (
            "One page split in two: structure on the left (what the argument's parts are), "
            "questions on the right (where I lost the thread). Afterwards, two minutes to "
            "convert the questions into a retrieval prompt. The note is filed with the "
            "question it answers."
        ),
        "exercise": (
            "Take one note you already have. Write at its top the question it answers. If "
            "no question fits, retire it."
        ),
        "judging_results": (
            "A note is working if you can answer its question from it cold. Notes that are "
            "never reopened are not evidence of note-taking skill."
        ),
        "traps": (
            "Transcribing instead of listening; filing by date rather than by question; "
            "judging a note by its length."
        ),
        "retrieval_check": (
            "What makes a reference note worth keeping?",
            (
                "It answers a specific future question",
                "It carries enough context (source, definition, mechanism) to be usable alone",
                "Volume is explicitly rejected as the measure",
            ),
        ),
    },
    {
        "slug": "memorisation-mechanism-and-exams",
        "title": "High-yield memorisation, mechanisms, and examinations",
        "group": "C",
        "topics": ("c_memorisation", "c_mechanism", "c_exams"),
        "model": (
            "Memorise what must be produced exactly and cannot be derived; build a "
            "mechanism for everything else so the detail has somewhere to attach. "
            "Misconceptions do not fade when the correct statement is repeated — they "
            "fade when the model that produced them is contradicted explicitly."
        ),
        "when_to_use": "Preparing for written or oral assessment, and whenever an error keeps returning.",
        "when_not_to_use": (
            "Memorising a derivation you do not understand. It survives exactly until the "
            "question is phrased differently."
        ),
        "worked_example": (
            "For an oral exam on aetiology: the mechanism explained aloud in ninety "
            "seconds, then the four facts that must be exact, then one question answered "
            "under time. The misconception you held is written down beside the correction "
            "so it can be tested again."
        ),
        "exercise": (
            "Write your three most persistent misconceptions and, for each, the model that "
            "produced them. Then write the correction as a change to that model."
        ),
        "judging_results": (
            "A misconception is resolved when a question designed to trigger it produces "
            "the corrected model unprompted. Feeling corrected is not the test."
        ),
        "traps": (
            "Rereading the correct version and assuming the wrong one left; preparing for "
            "the exam you would set rather than the one that will be given."
        ),
        "retrieval_check": (
            "How do you resolve a misconception, as distinct from learning the right answer?",
            (
                "Identify the model that produced the error",
                "Contradict that model explicitly",
                "Retest with a question designed to trigger the old error",
            ),
        ),
    },
    # ---------------------------------------------------------------- D
    {
        "slug": "cues-routines-environment",
        "title": "Cues, routines, and the environment that decides for you",
        "group": "D",
        "topics": ("d_formation", "d_intentions"),
        "model": (
            "A habit is a cue, a routine and a consequence, and the cue is the part worth "
            "designing. Environment design beats willpower because it removes choices: the "
            "book on the desk, the phone in another room."
        ),
        "when_to_use": "Building any behaviour you want to happen without deciding each time.",
        "when_not_to_use": (
            "For behaviour you do not actually want repeated. An effective cue for the "
            "wrong routine is a problem, not progress."
        ),
        "worked_example": (
            "Implementation intention: \"After I clear the plates, I open the problem set "
            "at the kitchen table.\" Environment: the folder is on the table, the phone "
            "charges in the hall. Two changes, both to the setting rather than to resolve."
        ),
        "exercise": (
            "Write one implementation intention in the after-I-X-I-will-Y form, and change "
            "one thing in the room to match it."
        ),
        "judging_results": (
            "Count how often the routine happened without a decision being made. If every "
            "instance required resolve, the cue is not working yet."
        ),
        "traps": (
            "Designing cues that depend on a tidy house, an empty calendar or a good mood; "
            "adding habits until the cue chain collides with itself."
        ),
        "retrieval_check": (
            "Why is the cue the part of a habit worth designing?",
            (
                "It is what starts the routine without a decision",
                "Environment design removes the choice, which is what willpower was compensating for",
            ),
        ),
    },
    {
        "slug": "unlearning-slips-and-perfectionism",
        "title": "Unlearning, slips, and the all-or-nothing trap",
        "group": "D",
        "topics": ("d_unlearning", "d_slips", "d_perfectionism", "d_measure"),
        "model": (
            "An unhelpful habit is replaced, not deleted: the cue stays and a competing "
            "response takes the routine's place. A slip is data about the design, not a "
            "verdict, and a system that cannot survive a slip is designed for someone who "
            "does not exist."
        ),
        "when_to_use": "After the second slip, and any time a habit's value is being inferred from its streak.",
        "when_not_to_use": (
            "Turning every interruption into a redesign. One broken day is noise; three "
            "in a fortnight is a pattern."
        ),
        "worked_example": (
            "The cue \"opening the laptop in the evening\" led to scrolling. Competing "
            "response: the laptop stays closed and the paper notebook comes out. Two slips "
            "in ten days were followed by one question — what preceded them — not by "
            "abandoning the routine."
        ),
        "exercise": (
            "Name one habit you want to unlearn, its cue, and a competing response that "
            "fits the same cue. Then write what you will do after the next slip."
        ),
        "judging_results": (
            "Measure outcomes, not streaks: did the reading happen more often, was the work "
            "better, did the sessions get easier to start? A 40-day streak of a habit that "
            "changes nothing is 40 days spent."
        ),
        "traps": (
            "All-or-nothing restart (\"I'll begin again on Monday\"); measuring the streak "
            "because it is easy to measure and then optimising for it."
        ),
        "retrieval_check": (
            "What should replace a habit you want to stop, and what does a slip tell you?",
            (
                "A competing response attached to the same cue — the habit is replaced, not deleted",
                "A slip is evidence about the design, not about the person",
            ),
        ),
    },
    # ---------------------------------------------------------------- E
    {
        "slug": "decay-and-maintenance",
        "title": "Decay, and deciding what deserves maintenance",
        "group": "E",
        "topics": ("e_decay",),
        "model": (
            "Everything decays; maintenance is a budget. The question is not \"how do I "
            "keep all of it\" but \"which of this will I need to produce, and when\". "
            "Material you will look up does not need to be held."
        ),
        "when_to_use": "Whenever a review queue grows faster than it can be cleared.",
        "when_not_to_use": (
            "As a reason to abandon foundations. Prerequisites of everything you keep are "
            "maintained first."
        ),
        "worked_example": (
            "Three tiers written down: produce from memory (maintain on a schedule), "
            "recognise and locate (light review), look up when needed (no review, keep the "
            "reference note). Half the deck is retired into the third tier."
        ),
        "exercise": (
            "Sort twenty items into those three tiers and write the rule you used, so the "
            "next sort does not require starting again."
        ),
        "judging_results": (
            "The queue should shrink in proportion to what you retired, and nothing in tier "
            "one should lapse. A queue that stays the same size has not been triaged."
        ),
        "traps": (
            "Treating all knowledge as equally worth keeping; retiring something that "
            "everything else depends on."
        ),
        "retrieval_check": (
            "What three tiers of knowledge are useful, and what does each require?",
            (
                "Produce from memory — scheduled maintenance",
                "Recognise and locate — light review",
                "Look up when needed — no review, keep the reference",
            ),
        ),
    },
    {
        "slug": "undefined-methods-and-question-led-focus",
        "title": "Two undefined methods, and question-led focus",
        "group": "E",
        "topics": ("e_filter", "e_inquiry", "e_order"),
        "model": (
            "Two techniques in this curriculum arrive as names without definitions. Their "
            "underlying problems are recognisable — deciding what a source is worth before "
            "spending time on it, and choosing the order in which parts are learned — and "
            "both can be worked on with methods that are described openly. Inquiry-based "
            "learning inverts the usual sequence: hold a question and read against it."
        ),
        "when_to_use": "Choosing what to study from a source, and deciding sequence.",
        "when_not_to_use": (
            "Reading against a question you have not yet earned. Without enough background, "
            "the question is a guess and the reading misses the structure."
        ),
        "worked_example": (
            "Before a long source: write one question worth an hour, and one sentence on "
            "why this source might answer it. Order: prerequisites first, then the part "
            "that yields the most reusable idea, then the rest only if the question persists."
        ),
        "exercise": (
            "Take a source you intend to read. Write the question, the order you will "
            "read it in, and what would make you stop."
        ),
        "judging_results": (
            "The result is time not spent on low-value material, plus an answer you can "
            "state. If you finished the source and cannot state the answer, the question "
            "was not doing any work."
        ),
        "traps": (
            "Inventing a procedure for a named method and presenting it as the method; "
            "choosing an order by the source's own chapter numbering without checking "
            "prerequisites."
        ),
        "retrieval_check": (
            "What do you do when a named technique has no supplied definition?",
            (
                "Do not fabricate its steps or provenance",
                "Identify the learning problem it addresses",
                "Use an independently supported method for that problem, and say so",
            ),
        ),
    },
    {
        "slug": "chunking-maps-and-integration",
        "title": "Chunking, maps, and integrating across domains",
        "group": "E",
        "topics": ("e_chunking", "e_maps", "e_map_testing", "e_integration"),
        "model": (
            "A chunk is a group of items retrievable as one unit, which is why compression "
            "helps — until the chunk is so compressed that its parts can no longer be "
            "recovered. A map is a claim about relationships, so its arrows should be "
            "labelled and testable; a map you cannot be tested from is decoration."
        ),
        "when_to_use": "Material with many parts and relationships; revision that keeps fragmenting.",
        "when_not_to_use": (
            "As the first pass over unfamiliar material. Mapping before understanding "
            "produces a tidy drawing of a wrong model."
        ),
        "worked_example": (
            "A map of five concepts with labelled edges (\"causes\", \"requires\", "
            "\"contradicts\"). Then the map is covered and redrawn from memory; the "
            "differences are the revision content, not the original drawing."
        ),
        "exercise": (
            "Draw a labelled map of six concepts from two different subjects, then redraw "
            "it from memory and list what you lost."
        ),
        "judging_results": (
            "Redraw accuracy and the number of relationships you can state verbally. "
            "Neatness is not a measure."
        ),
        "traps": (
            "Overcompressing until the parts are gone; drawing maps you never test "
            "yourself from; connecting subjects with edges you cannot justify."
        ),
        "retrieval_check": (
            "How do you test yourself from a map, and what makes an edge meaningful?",
            (
                "Cover it and redraw from memory; compare and treat the differences as the content",
                "An edge names a relationship you can justify (causes, requires, contrasts with)",
            ),
        ),
    },
    # ---------------------------------------------------------------- F
    {
        "slug": "prioritising-under-uncertainty",
        "title": "Prioritising when you do not have the information",
        "group": "F",
        "topics": ("f_prioritise",),
        "model": (
            "With incomplete information, order by consequence and reversibility rather "
            "than by certainty. Do the thing that is expensive to get wrong and hard to "
            "undo first; defer what you can learn more about cheaply."
        ),
        "when_to_use": "Deadlines with several unfinished pieces and no clear picture.",
        "when_not_to_use": (
            "When the highest-consequence item is also the one you understand least — then "
            "the first action is a small probe, not the whole task."
        ),
        "worked_example": (
            "Three assignments, two weeks: the one that gates the others is scheduled "
            "first even though it is not the most enjoyable, and the one whose brief may "
            "still change is deferred by a week with a question sent today."
        ),
        "exercise": (
            "List what is outstanding. Mark each as reversible or not, and what you would "
            "learn by waiting. Reorder."
        ),
        "judging_results": (
            "You should be able to say, for each deferral, what you are waiting to learn. "
            "A deferral with no such sentence is avoidance wearing a schedule."
        ),
        "traps": (
            "Prioritising by due date when a later deadline gates an earlier one; treating "
            "uncertainty as a reason to postpone all decisions."
        ),
        "retrieval_check": (
            "What two properties decide order when information is incomplete?",
            (
                "Consequence (how expensive to get wrong)",
                "Reversibility (how hard to undo)",
                "What you would learn by waiting",
            ),
        ),
    },
    {
        "slug": "attention-load-and-flow",
        "title": "Attention, cognitive load, and rest that is actually rest",
        "group": "F",
        "topics": ("f_attention", "f_load", "f_flow", "f_energy"),
        "model": (
            "Every context switch costs re-entry time that is not visible in the schedule. "
            "Cognitive load has a ceiling set by the material and the learner, and rest "
            "restores attention only when it is not also loading it — scrolling does not "
            "count as recovery."
        ),
        "when_to_use": "Designing a study week, and after noticing the same paragraph read three times.",
        "when_not_to_use": (
            "As an argument against difficulty. Load from the material's complexity is the "
            "work; load from a bad interface, a noisy room or fifteen tabs is the waste."
        ),
        "worked_example": (
            "Two 40-minute blocks with one 10-minute walk, phone in another room, one tab "
            "open. Work that needs decisions (problem sets) scheduled in the morning; "
            "retrieval in the afternoon when it is harder but less decision-heavy."
        ),
        "exercise": (
            "For one day, record each switch (what interrupted, how long to re-enter). "
            "Name the two most expensive and remove one."
        ),
        "judging_results": (
            "Fewer switches and shorter re-entry times. A day that felt busy with no "
            "increase in output is the signal, not the noise."
        ),
        "traps": (
            "Treating rest as another task to optimise; confusing flow with a plan that "
            "has no stopping condition."
        ),
        "retrieval_check": (
            "What is the difference between useful load and wasted load, and what makes rest restorative?",
            (
                "Useful load comes from the material's intrinsic complexity",
                "Wasted load comes from environment, interface and task switching",
                "Rest is restorative when it does not itself demand attention",
            ),
        ),
    },
    {
        "slug": "systems-that-cost-more-than-they-save",
        "title": "Systems that cost more than they save",
        "group": "F",
        "topics": ("f_overhead",),
        "model": (
            "A productivity system has a cost: maintenance, decisions, upkeep. It pays "
            "only if the time it returns exceeds the time it takes, measured in work "
            "produced rather than in system completeness."
        ),
        "when_to_use": "When maintaining the system has become a category of work.",
        "when_not_to_use": (
            "As a reason to abandon structure entirely. The failure is a system too "
            "expensive for its job, not the idea of having one."
        ),
        "worked_example": (
            "Three tools became one page and one calendar. Two recurring reviews became "
            "one weekly audit. The saved minutes go into a problem set — otherwise the "
            "simplification is just a tidier way to do the same amount of nothing."
        ),
        "exercise": (
            "List every system you maintain in a week and the minutes each takes. Cut the "
            "one with the worst ratio and record what the time went to."
        ),
        "judging_results": (
            "Look for the saved time appearing in output. If nothing replaced it, the "
            "simplification was cosmetic."
        ),
        "traps": (
            "Replacing a heavy system with a new lighter system that needs setting up for "
            "a fortnight; measuring the system's elegance instead of its yield."
        ),
        "retrieval_check": (
            "How do you judge whether a productivity system is worth its cost?",
            (
                "Compare time returned against time spent maintaining it",
                "The measure is work produced, not system completeness",
            ),
        ),
    },
    # ---------------------------------------------------------------- G
    {
        "slug": "card-selection-and-pruning",
        "title": "Card selection and pruning",
        "group": "G",
        "topics": ("g_cards",),
        "model": (
            "A deck is a maintenance liability. Each card is a promise to review it "
            "forever, so it must earn its place: atomic, hard to guess, and worth "
            "producing from memory."
        ),
        "when_to_use": "Building or pruning any deck.",
        "when_not_to_use": (
            "For material whose value is in the shape of the argument. Cards atomise, and "
            "some knowledge does not survive atomisation."
        ),
        "worked_example": (
            "A paragraph about a mechanism becomes three cards: the mechanism's trigger, "
            "its consequence, and the exception. Anything that only needed recognising is "
            "deleted."
        ),
        "exercise": (
            "Prune one deck by a third. For each deletion, write the reason in one word "
            "(duplicate, trivial, unclear, not needed)."
        ),
        "judging_results": (
            "Review time drops and delayed recall holds. A deck that shrank and whose "
            "recall improved was over-full, not under-full."
        ),
        "traps": (
            "Keeping a card because deleting it feels like losing knowledge; splitting one "
            "idea into six cards that are individually unanswerable."
        ),
        "retrieval_check": (
            "What does each card commit you to, and what happens to a deck that ignores it?",
            (
                "Ongoing maintenance — every card is a promise to review it",
                "An unpruned deck becomes unmaintainable, and then abandoned",
            ),
        ),
    },
    {
        "slug": "loci-rote-and-limits",
        "title": "Spatial memory, rote, and where memorisation is unsafe",
        "group": "G",
        "topics": ("g_loci", "g_detail", "g_rote", "g_limits"),
        "model": (
            "The method of loci binds items to a route you already know, which works well "
            "for ordered lists and poorly for anything that needs to be reasoned about. "
            "Rote is correct for exact strings and unsafe wherever the cost of a "
            "misremembered step is harm."
        ),
        "when_to_use": "Ordered lists, exact terminology, and procedural steps that must be reproduced verbatim.",
        "when_not_to_use": (
            "Replacing understanding. A memorised explanation you cannot defend "
            "deteriorates into a confident sentence detached from its evidence."
        ),
        "worked_example": (
            "A twelve-step protocol is placed along a familiar route, then each step is "
            "rehearsed with its reason attached. The route fixes the order; the reasons "
            "prevent the order from being applied to the wrong case."
        ),
        "exercise": (
            "Memorise an ordered list of eight items with a route, then reproduce it a day "
            "later with the reason for two of them."
        ),
        "judging_results": (
            "Order accuracy a day later, plus the ability to explain why the order is what "
            "it is. Order without reason is a hazard in applied material."
        ),
        "traps": (
            "Using memory palaces for material that needs explanation; memorising a "
            "clinical or technical step without its indications, contraindications and the "
            "fact that you are not yet qualified to apply it."
        ),
        "retrieval_check": (
            "When does rote memorisation become unsafe?",
            (
                "When a misremembered step causes harm or removal of judgement",
                "When it replaces understanding of why the step exists",
                "Names that clinical/technical procedures need indications and limits, not just steps",
            ),
        ),
    },
    # ---------------------------------------------------------------- H
    {
        "slug": "whole-part-whole",
        "title": "Whole, part, whole",
        "group": "H",
        "topics": ("h_wpw",),
        "model": (
            "See the whole once for orientation, take one part apart until it is "
            "understood, then rebuild the whole from what you have. The final step is the "
            "one usually skipped, and it is the one that produces understanding of how the "
            "parts depend on each other."
        ),
        "when_to_use": "Complex systems, arguments and procedures with many interacting parts.",
        "when_not_to_use": (
            "Very small material, where the whole is the part and the cycle is overhead."
        ),
        "worked_example": (
            "A compiler: run one program end to end (whole), then take the parser alone "
            "(part), then explain the program's journey again with the parser's input and "
            "output named (whole). The second whole is where the dependencies appear."
        ),
        "exercise": (
            "Choose a system you are studying. Do the three passes in one sitting and "
            "write what you could not explain in the first whole that you can explain now."
        ),
        "judging_results": (
            "The second whole should be materially more connected than the first. If you "
            "can only report the part in detail, the reassembly did not happen."
        ),
        "traps": (
            "Stopping after the part because it felt productive; treating the first whole "
            "as understanding rather than orientation."
        ),
        "retrieval_check": (
            "What does the third pass add that the first two do not?",
            (
                "Rebuilt whole from memory, showing dependencies between parts",
                "The first whole is orientation only, not comprehension",
            ),
        ),
    },
    {
        "slug": "self-explanation-and-teaching",
        "title": "Self-explanation, teaching, and multilevel recall",
        "group": "H",
        "topics": ("h_self_explain", "h_multilevel"),
        "model": (
            "Explaining forces every gap into the open, because a sentence you cannot "
            "finish is a gap you cannot see while rereading. Multilevel recall is the same "
            "idea applied to depth: state it in one line, then a paragraph, then with the "
            "mechanism and its exceptions."
        ),
        "when_to_use": "After a first pass, and whenever understanding feels fluent but thin.",
        "when_not_to_use": (
            "Before any encoding. Explaining from nothing produces a confident summary of "
            "your own assumptions."
        ),
        "worked_example": (
            "One minute: what is entropy, in one sentence. Five minutes: the paragraph, "
            "with the mechanism. Then, with the page closed, the statement a colleague "
            "would challenge — and the answer."
        ),
        "exercise": (
            "Explain one concept at three depths, recorded spoken, without notes. Then "
            "transcribe and mark where you stalled."
        ),
        "judging_results": (
            "Where you stalled is the content of the next session. Smooth delivery at one "
            "depth and collapse at another is the normal, useful result."
        ),
        "traps": (
            "Explaining to yourself in the language of the source; mistaking fluency for "
            "depth; teaching a simplified version you would not defend."
        ),
        "retrieval_check": (
            "Why does explanation reveal gaps that rereading does not?",
            (
                "Producing language requires reconstruction; recognising text does not",
                "A sentence you cannot finish localises the gap",
            ),
        ),
    },
    {
        "slug": "reconstruction-transfer-and-reasoning-errors",
        "title": "Reconstructing, transferring, and correcting the model",
        "group": "H",
        "topics": ("h_reconstruct", "h_transfer", "h_reasoning"),
        "model": (
            "Rebuilding a system or argument from memory tests structure rather than "
            "details. Transfer tests whether the structure was abstracted or only bound to "
            "the example, and a recurring error usually belongs to the model rather than "
            "to the instance."
        ),
        "when_to_use": "Late in a topic, and whenever the same mistake appears in new material.",
        "when_not_to_use": (
            "Early, when there is no structure yet to rebuild. Reconstruction of a "
            "half-learned system produces a plausible fiction."
        ),
        "worked_example": (
            "Blank page: draw the argument's premises, inference and conclusion, then the "
            "objection that would break it. Then apply the same structure to a case from "
            "another subject and see whether the inference survives."
        ),
        "exercise": (
            "Reconstruct one argument from memory, then find a case from a different domain "
            "where the same reasoning applies or fails."
        ),
        "judging_results": (
            "Structure reproduced, objection identified, and a transfer case correctly "
            "classified. Failing the transfer while passing the recall means the structure "
            "was example-bound."
        ),
        "traps": (
            "Correcting the instance instead of the model; treating transfer failure as a "
            "memory problem when it is an abstraction problem."
        ),
        "retrieval_check": (
            "What does a transfer failure tell you that a recall success does not?",
            (
                "That the structure was bound to the original example, not abstracted",
                "The correction belongs to the model, not to the instance",
            ),
        ),
    },
    # ---------------------------------------------------------------- I
    {
        "slug": "cramming-and-multi-pass",
        "title": "Cramming, and multi-pass under restricted time",
        "group": "I",
        "topics": ("i_cramming", "i_multipass"),
        "model": (
            "Cramming produces availability now and decay later; it is a rational choice "
            "for a test tomorrow and a poor one for knowledge you need in six weeks. "
            "Under restricted time, several short passes with retrieval between them beat "
            "one long read, because each pass starts from what survived the last."
        ),
        "when_to_use": "When time is genuinely short, and when choosing how to spend the last two days.",
        "when_not_to_use": (
            "As the default. A cramming habit that works for assessments is exactly how "
            "material becomes unavailable when it is needed later."
        ),
        "worked_example": (
            "Two days: pass one, whole structure (60 min); pass two, retrieval on the "
            "structure (30 min); pass three, only what failed (30 min); pass four, one "
            "timed question. Reading continuously for two days replaces all four passes "
            "with one."
        ),
        "exercise": (
            "Plan a two-day recovery for one subject as passes with retrieval between "
            "them, and name what you are deliberately not covering."
        ),
        "judging_results": (
            "Performance on a delayed question, not on tomorrow's. If nothing is retained "
            "a week later, the cramming bought the assessment and nothing else — which is "
            "a decision to make knowingly."
        ),
        "traps": (
            "Confusing familiarity from a long read with retention; planning passes so "
            "tight that no retrieval fits between them."
        ),
        "retrieval_check": (
            "What does cramming buy, what does it cost, and what replaces it under time pressure?",
            (
                "Buys short-term availability, costs delayed retention",
                "Multiple passes with retrieval between them",
                "Knowingly choosing it rather than defaulting to it",
            ),
        ),
    },
    {
        "slug": "next-best-action-and-exam-execution",
        "title": "The next best action, and executing under exam conditions",
        "group": "I",
        "topics": ("i_next_action", "i_exam_execution", "i_silly_errors", "i_defer"),
        "model": (
            "With ten minutes left, the best action is the one with the highest expected "
            "gain per minute, not the one you were doing. In an exam, most avoidable loss "
            "comes from misreading the question, allocating time badly and not checking "
            "the units — all three are trainable."
        ),
        "when_to_use": "Any assessment, and any week with more material than time.",
        "when_not_to_use": (
            "Deciding what not to learn in a subject that is foundational to everything "
            "after it. Deferral is for the periphery."
        ),
        "worked_example": (
            "Exam plan written in the first two minutes: question count, marks, minutes "
            "per mark, and the order chosen so the highest-value section is done while "
            "attention is best. A final five minutes is reserved for checking units, "
            "signs and whether every question was answered."
        ),
        "exercise": (
            "Do one past paper under time with a written plan, then classify every lost "
            "mark as knowledge, misreading, timing or checking."
        ),
        "judging_results": (
            "The classification tells you what to fix. Losing marks to misreading while "
            "knowing the content is a different problem from not knowing it, and more "
            "cheaply solved."
        ),
        "traps": (
            "Practising content you already know because it feels good; spending the "
            "checking time re-doing the question instead of checking it."
        ),
        "retrieval_check": (
            "What are the four categories of lost marks, and why separate them?",
            (
                "Knowledge, misreading, timing, checking",
                "They have different fixes; only one of them is a content problem",
            ),
        ),
    },
    {
        "slug": "efficiency-and-delayed-outcomes",
        "title": "Efficiency measured later",
        "group": "I",
        "topics": ("i_efficiency",),
        "model": (
            "Efficiency is output per unit of effort measured at a delay, because the "
            "immediate measures — pages read, hours logged, cards reviewed — all reward "
            "activity. A method that feels slow and produces recall in two weeks is more "
            "efficient than one that feels fast and produces nothing."
        ),
        "when_to_use": "Comparing two methods, and reviewing a month.",
        "when_not_to_use": (
            "As a reason to abandon a method after one week. Delayed outcomes need the "
            "delay to have passed."
        ),
        "worked_example": (
            "Two topics, two methods, one month. Both are tested cold after three weeks by "
            "the same kind of question. The method that felt worse and scored the same is "
            "the one to keep — it cost less."
        ),
        "exercise": (
            "Pick two comparable topics and two methods. Write now what you will test, and "
            "when, before you start."
        ),
        "judging_results": (
            "A delayed, unsupported test. Anything measured during the learning week is "
            "measuring the method's comfort, not its yield."
        ),
        "traps": (
            "Measuring hours; concluding from n=1 without saying so; changing two things "
            "at once and crediting the one you preferred."
        ),
        "retrieval_check": (
            "Why must efficiency be measured at a delay, and what must you record about the sample?",
            (
                "Immediate measures reward activity, not retention",
                "The sample size and the fact it is uncontrolled, so no strong conclusion is drawn",
            ),
        ),
    },
)


# ------------------------------------------------------------- named methods, undefined


class NamedMethod(TypedDict):
    name: str
    status: str
    problem: str
    open_alternative: str
    note: str


#: Nine names from the source material. None has a supplied definition, so none
#: gets one here. `status` exists so a future stage can change it — and the only way
#: to change it is to add a source, which is a deliberate act rather than a guess.
NAMED_METHODS: tuple[NamedMethod, ...] = (
    {
        "name": "AIM",
        "status": "undefined",
        "problem": "An unstated sequence for approaching or organising study of a topic.",
        "open_alternative": "Write the sequence you actually use, name its steps, and test it against outcomes.",
        "note": "No definition, steps, evidence or ownership supplied. Not reconstructed here.",
    },
    {
        "name": "Bear Hunter System",
        "status": "undefined",
        "problem": "An unstated framing for sustained effort or persistence across a long goal.",
        "open_alternative": "Implementation intentions plus a weekly audit of what actually happened.",
        "note": "No definition supplied. The name is vivid and the content is not, which is exactly when fabrication happens.",
    },
    {
        "name": "VPReFRE criteria",
        "status": "undefined",
        "problem": "Appears to be a checklist for judging a source or a piece of material.",
        "open_alternative": "An explicit source-evaluation checklist you write and can justify: who, when, evidence, conflicts, relevance.",
        "note": "The acronym is supplied without its expansion. Expanding it would be invention.",
    },
    {
        "name": "GRINDE maps",
        "status": "undefined",
        "problem": "Appears to be a mapping or structuring method for knowledge.",
        "open_alternative": "A labelled concept map, tested by redrawing it from memory (lesson: chunking, maps and integration).",
        "note": "No definition or example supplied. The generic mapping lesson is offered instead of a guess at the acronym.",
    },
    {
        "name": "PEER-Peer",
        "status": "undefined",
        "problem": "Appears to describe a peer-based or reciprocal teaching arrangement.",
        "open_alternative": "Explain a concept to a peer and have them ask one question you cannot answer.",
        "note": "No definition supplied. Reciprocal teaching has independent support; the named variant is not described.",
    },
    {
        "name": "OFF-rest timing",
        "status": "undefined",
        "problem": "Appears to concern when to stop and rest.",
        "open_alternative": "A fixed interval that ends the block by design, with rest that does not demand attention.",
        "note": "No timings supplied. Any number written here would be invented.",
    },
    {
        "name": "survive-and-thrive filter",
        "status": "undefined",
        "problem": "Deciding what a source must give you now versus what can wait.",
        "open_alternative": "The three-tier decay triage: produce, recognise, look up.",
        "note": "Listed in the curriculum alongside this note; no procedure was supplied.",
    },
    {
        "name": "order control",
        "status": "undefined",
        "problem": "Choosing the sequence in which parts of a subject are learned.",
        "open_alternative": "Prerequisite-first ordering, with the highest-reuse idea next.",
        "note": "The phrase is supplied; the rule is not.",
    },
    {
        "name": "Huddle framework",
        "status": "undefined",
        "problem": "Appears to describe a short, repeated group or self-review meeting.",
        "open_alternative": "A five-minute weekly audit with three written lines: method used, evidence produced, one change.",
        "note": "No definition supplied. The audit is the independently supported substitute.",
    },
)


# ----------------------------------------------------------- self-management baseline
#
# Nine items, answered on a four-point frequency scale. This is a *description*,
# not an instrument: no total is computed, no percentage is derived. The document
# asks for a behavioural baseline "without inventing a percentage", and the scale
# exists so answers can be compared to themselves over time.


class BaselineItem(TypedDict):
    key: str
    prompt: str
    options: tuple[str, ...]


BASELINE_ITEMS: tuple[BaselineItem, ...] = (
    {
        "key": "planning",
        "prompt": "In a typical week, I decide what to study before the day begins.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "prioritising",
        "prompt": "When several things are due, I know which one I will do first and why.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "starting",
        "prompt": "I begin the planned work within fifteen minutes of the planned time.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "finishing",
        "prompt": "Sessions end because the objective was met, not because attention ran out.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "procrastination",
        "prompt": "I postpone work I have already decided to do.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "distraction",
        "prompt": "An interruption costs me more than a minute of attention to recover from.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "decision_fatigue",
        "prompt": "By the evening, choosing what to study is harder than doing it.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "energy",
        "prompt": "I schedule demanding work when my energy is highest.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
    {
        "key": "recovery",
        "prompt": "After a disruption of several days, I resume without restarting the plan from scratch.",
        "options": ("never", "sometimes", "most days", "every day"),
    },
)


#: What the observation task records. The numbers are minutes and counts, which is
#: the whole point: this is the part that is not self-report.
OBSERVATION_FIELDS: tuple[tuple[str, str], ...] = (
    ("task", "What you intended to do"),
    ("planned_minutes", "Minutes you planned"),
    ("actual_minutes", "Minutes actually worked"),
    ("started_after_minutes", "Minutes between intending to start and starting"),
    ("interruptions", "Number of interruptions"),
    ("resumed_after_minutes", "Minutes to get back to work after the largest interruption"),
    ("finished", "Whether the objective was met"),
)


# ------------------------------------------------------------------- personal protocol
#
# The eleven components the document requires, plus material examples. A protocol
# cannot be marked current until every section has content and all four material
# types have an example; the gate says which are missing.

PROTOCOL_SECTIONS: tuple[tuple[str, str], ...] = (
    ("preparation", "Pre-learning preparation and priority selection"),
    ("priming", "Time-boxed priming and prerequisite check"),
    ("encoding", "Encoding and explanation workflow"),
    ("reference", "Rules for deciding what becomes a reference note"),
    ("retrieval", "Retrieval and error-correction workflow"),
    ("review", "Review scheduling and interleaving policy"),
    ("overlearning", "Criteria for selective overlearning"),
    ("attention", "Attention, break and recovery protocol"),
    ("reflection", "Post-session reflection and next action"),
    ("weekly", "Weekly self-regulation audit"),
    ("monthly", "Monthly review of retention, understanding, transfer, workload and well-being"),
    ("experiments", "How you will compare techniques without over-reading small samples"),
)

MATERIAL_TYPES: tuple[tuple[str, str], ...] = (
    ("factual", "Material that must be produced exactly"),
    ("conceptual", "Material that must be explained or reasoned about"),
    ("procedural", "Material that must be executed in order"),
    ("application", "Material that must be transferred to a new problem"),
)

#: Guidance per material type, used to prefill nothing but to explain what an
#: example should contain. Prefilling would make the protocol the assistant's, not
#: the learner's.
MATERIAL_GUIDANCE: dict[str, str] = {
    "factual": "Which facts, how they will be retrieved, at what interval, and when you would stop maintaining them.",
    "conceptual": "How you will explain the mechanism, what you will do when the explanation feels fluent, and how you will test it.",
    "procedural": "How you will practise the order, which errors are unsafe, and how you will check before applying it.",
    "application": "How you will find unfamiliar problems and what counts as successful transfer.",
}


def lesson_by_slug(slug: str) -> Lesson | None:
    for lesson in LESSONS:
        if lesson["slug"] == slug:
            return lesson
    return None


def lesson_slugs() -> tuple[str, ...]:
    return tuple(lesson["slug"] for lesson in LESSONS)


def covered_topics() -> tuple[str, ...]:
    return tuple(topic for lesson in LESSONS for topic in lesson["topics"])
