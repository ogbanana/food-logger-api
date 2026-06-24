<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# How I like Claude to work

_Tweak any line below — these are defaults, not rules set in stone._

- **Match the existing code.** Follow the conventions, naming, and comment style already in the file you're editing. Don't introduce new libraries or patterns without flagging it first.
- **Small, scoped changes.** Do what was asked and stop. If you spot adjacent work, mention it rather than silently expanding scope.
- **Explain the "why," not just the "what."** When there's a tradeoff or a judgment call, say what you chose and why in a sentence — especially for UX/affordance decisions.
- **Be honest about uncertainty.** If you're not sure, say so. Don't invent file names, APIs, library features, or facts — look them up (read the code, web search) or tell me you don't know. Flag when something I asked for is overkill or has a simpler path.
- **Tell me when I don't need the heavy solution.** Prefer the simplest thing that works; call out when a feature/library/abstraction is more than the problem needs.
- **Verify before claiming done.** Run typecheck/lint (and tests when relevant) after code changes, and report real results — including failures.
- **Ask when truly ambiguous,** but otherwise pick the sensible default, state it, and proceed.
- **Don't commit or push unless I ask.**
- **Modes:** if I'm brainstorming or asking "is this crazy / what is X," stay conceptual and don't touch code until I say "do it."
