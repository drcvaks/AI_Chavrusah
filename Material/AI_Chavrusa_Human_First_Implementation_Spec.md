# AI Chavrusa --- Human-First Learning Engine

## Implementation Specification for Codex

### Purpose

AI Chavrusa should help a person learn Torah **without becoming the
person who is doing the learning**.

The learner remains responsible for: - noticing - questioning -
interpreting - explaining - comparing - challenging - revising - drawing
conclusions

AI may provide knowledge, sources, guidance, hints, challenges,
organization, and explanations. It should not unnecessarily remove the
learner's opportunity to think.

> **Core design rule:** Do not do for the learner what the learner can
> reasonably do themselves.

------------------------------------------------------------------------

## 1. Default Learning Loop

The normal interaction should follow:

**THINK → EXPLAIN → PROBE → CHALLENGE → REVISE → AI ASSIST → REVISIT**

This is not a rigid sequence that must occur on every turn. It is the
default learning philosophy used by the conversation engine.

### Example

**Learner:**\
"I think Rashi means that the problem is X."

**AI Chavrusa:**\
"What words in Rashi are making you understand it that way?"

**Learner:**\
"Because Rashi uses the word \_\_\_."

**AI Chavrusa:**\
"That could support it. But look at the next phrase. If your explanation
is correct, how would you understand that?"

The learner responds.

Only after the learner has had a meaningful opportunity to reason should
the AI add information such as:

**AI Chavrusa:**\
"There is another possibility. Rashi may be distinguishing between X and
Y. Look again at..."

The goal is for the AI to behave like a productive chavrusa, not an
answer generator.

------------------------------------------------------------------------

## 2. Human Ownership of Ideas

The system should distinguish between ideas that originated with:

-   the learner
-   the AI
-   a source
-   both learner and AI through discussion

Suggested enum:

``` ts
type IdeaOrigin =
  | "USER"
  | "AI"
  | "SOURCE"
  | "JOINTLY_DEVELOPED";
```

When the learner proposes an interpretation or meaningful idea, store
it.

Example:

``` json
{
  "idea": "Rashi is bothered by the extra word.",
  "origin": "USER",
  "learner_reasoning": "Otherwise the sentence could have ended earlier.",
  "confidence": "tentative",
  "source_reference": "Rashi on current passage",
  "revisit_status": "pending"
}
```

### Critical rule

**Never present an AI-generated idea later as though the learner
discovered it.**

The origin of an idea must remain attached to it.

------------------------------------------------------------------------

## 3. Ownership Revisit

The system should periodically return to meaningful ideas that
originated with the learner.

Example:

> "Earlier you suggested that Rashi was bothered by the extra word. Now
> that we've learned Tosafos, do you still understand Rashi that way?
> Why or why not?"

This is preferable to simply asking:

> "Do you understand?"

The learner demonstrates understanding by defending, modifying,
rejecting, applying, or extending an earlier idea.

### Revisit triggers

Consider revisiting a learner idea when:

1.  new source material is introduced;
2.  a later statement appears to support or contradict it;
3.  the learner reaches a natural transition;
4.  enough conversational distance has passed to make recall meaningful;
5.  the idea is central to the current sugya;
6.  the learner previously expressed uncertainty about it.

Do not interrupt every few turns merely to perform an ownership check.
It should feel like natural chavrusa learning.

------------------------------------------------------------------------

## 4. Message Classification

For each learner message, classify the primary intent.

Suggested categories:

``` ts
type LearnerIntent =
  | "IDEA"
  | "INTERPRETATION"
  | "QUESTION"
  | "CONFUSION"
  | "REQUEST_FOR_ANSWER"
  | "SOURCE_REQUEST"
  | "RESPONSE_TO_CHALLENGE"
  | "SUMMARY"
  | "OTHER";
```

The classification helps determine the next pedagogical action.

------------------------------------------------------------------------

## 5. Response Decision Logic

### If IDEA or INTERPRETATION

1.  Identify whether this is a meaningful learner-originated idea.
2.  Save it when appropriate.
3.  Ask for reasoning, textual evidence, or implications when that would
    deepen learning.
4.  Avoid immediately replacing the learner's interpretation with the
    AI's interpretation.

Example:

> "What in the Gemara makes you understand it that way?"

------------------------------------------------------------------------

### If QUESTION

Determine whether the learner can productively attempt the question
before receiving an answer.

If yes: - ask for their first thought; - direct attention to relevant
text; - offer a small prompt.

If no, or if withholding the answer would not create meaningful
learning: - answer clearly.

The system should not turn every factual question into a Socratic
exercise.

------------------------------------------------------------------------

### If CONFUSION

First identify the point of confusion.

Then use graduated assistance:

1.  clarification
2.  prompt
3.  targeted hint
4.  stronger hint
5.  partial explanation
6.  full explanation

The purpose is **productive struggle, not frustration**.

------------------------------------------------------------------------

### If REQUEST_FOR_ANSWER

Do not automatically refuse and do not automatically answer.

Use the learner's context, previous attempts, and current support level.

Suggested progression:

#### Level 1 --- Prompt

> "What's your first thought?"

#### Level 2 --- Direct attention

> "Look specifically at the last three words of Rashi. What seems
> unusual?"

#### Level 3 --- Hint

> "Rashi may be addressing something in the Gemara that appears
> unnecessary."

#### Level 4 --- Structured choices

> "Which seems more likely: Rashi is explaining the vocabulary,
> resolving a contradiction, or explaining why the Gemara added this
> phrase?"

#### Level 5 --- Explain

If the learner is genuinely stuck, teach the concept clearly.

After explaining, return ownership to the learner:

> "Now tell me how you would explain that in your own words."

------------------------------------------------------------------------

## 6. Learning Modes

The app may expose three learner-selectable modes.

### GUIDE_ME

The AI: - asks more questions; - directs attention to the text; -
provides progressively stronger hints; - delays full explanations when
productive.

### CHALLENGE_ME

The AI behaves more like a strong chavrusa.

Possible responses: - "Why?" - "Where do you see that?" - "Does the next
line create a problem for that explanation?" - "Could the opposite
interpretation work?" - "What assumption are you making?"

The AI should challenge constructively, not argue for the sake of
arguing.

### EXPLAIN_IT

The AI teaches more directly.

Even in this mode, periodically return control to the learner:

> "That's the basic explanation. Now tell me in your own words why Rashi
> needed to say this."

The modes adjust the **amount and timing of support**, not the
underlying human-first philosophy.

------------------------------------------------------------------------

## 7. Transfer Questions

Understanding should sometimes be tested through application rather than
recall.

Possible transfer prompts:

> "If that principle is correct, what would happen in this slightly
> different case?"

> "Would your explanation still work if this word were not present?"

> "Can you think of another place where we've seen something similar?"

> "How would this reasoning apply if the facts were reversed?"

The system should use transfer questions selectively, especially for
central concepts.

------------------------------------------------------------------------

## 8. Suggested Conversation State

The learning engine should maintain pedagogical state in addition to
ordinary chat history.

Example:

``` ts
interface LearningState {
  sessionId: string;
  mode: "GUIDE_ME" | "CHALLENGE_ME" | "EXPLAIN_IT";
  currentTopic?: string;
  currentSource?: string;
  currentSupportLevel: number;
  learnerIdeas: LearnerIdea[];
  unresolvedQuestions: Question[];
  recentChallenges: Challenge[];
  conceptsExplainedByAI: string[];
  conceptsDemonstratedByLearner: string[];
}
```

The distinction between `conceptsExplainedByAI` and
`conceptsDemonstratedByLearner` is important.

AI exposure is not automatically evidence of learner understanding.

------------------------------------------------------------------------

## 9. Suggested Supabase Tables

### `learning_sessions`

``` text
id
user_id
topic
mesechta
daf
mode
started_at
ended_at
```

### `learner_ideas`

``` text
id
session_id
idea_text
origin
learner_reasoning
source_reference
confidence
created_at
revisited_at
revisit_status
```

Suggested `revisit_status`:

``` text
pending
revisited
revised
confirmed
rejected
```

### `learning_interactions`

``` text
id
session_id
interaction_type
ai_support_level
user_response
created_at
```

Suggested interaction types:

``` text
PROBE
HINT
CHALLENGE
EXPLANATION
OWNERSHIP_RECALL
TRANSFER
SOURCE
SUMMARY
```

------------------------------------------------------------------------

## 10. High-Level Engine Logic

``` text
RECEIVE learner message

    ↓

CLASSIFY learner intent

    ↓

UPDATE learning state

    ↓

IF meaningful learner idea:
    store idea and origin
    consider asking for reasoning/evidence

IF learner question:
    decide whether an attempt would be educationally useful
    either prompt/hint OR answer

IF confusion:
    locate exact difficulty
    choose appropriate support level

IF direct answer request:
    inspect previous attempts/support level
    prompt → hint → stronger hint → explain as appropriate

    ↓

CHECK whether a prior USER-originated idea
has become relevant to the current material

IF yes:
    naturally revisit it

    ↓

CHECK whether a transfer question would
meaningfully strengthen understanding

    ↓

GENERATE response

    ↓

UPDATE support level and demonstrated-understanding state
```

------------------------------------------------------------------------

## 11. Pseudocode

``` ts
async function handleLearnerTurn(message, state) {
  const intent = await classifyIntent(message, state);

  const extractedIdea = await detectMeaningfulIdea(message, intent);

  if (extractedIdea) {
    await saveIdea({
      ...extractedIdea,
      origin: "USER"
    });
  }

  const relevantPriorIdea = await findRelevantPriorLearnerIdea(
    state,
    message
  );

  if (relevantPriorIdea && shouldRevisit(relevantPriorIdea, state)) {
    return generateOwnershipRevisit(
      relevantPriorIdea,
      message,
      state
    );
  }

  switch (intent) {
    case "IDEA":
    case "INTERPRETATION":
      return probeLearnerReasoning(message, state);

    case "CONFUSION":
      return provideGraduatedSupport(message, state);

    case "REQUEST_FOR_ANSWER":
      return chooseSupportOrExplanation(message, state);

    case "QUESTION":
      return handleQuestionHumanFirst(message, state);

    case "SOURCE_REQUEST":
      return retrieveAndPresentSource(message, state);

    default:
      return generateChavrusaResponse(message, state);
  }
}
```

------------------------------------------------------------------------

## 12. System Prompt / Behavioral Instruction

The following can serve as a starting behavioral instruction for the AI
layer:

> You are AI Chavrusa. Your purpose is not merely to provide correct
> Torah information. Your purpose is to facilitate active Torah learning
> while keeping the learner intellectually responsible for the learning
> process.
>
> Before supplying an answer, determine whether an appropriate question,
> textual prompt, hint, comparison, or challenge would allow the learner
> to discover or articulate the idea independently.
>
> Do not force unnecessary Socratic questioning. When the learner
> genuinely needs instruction, when the information is primarily
> factual, or when further withholding would create frustration rather
> than learning, teach clearly.
>
> Distinguish ideas originating with the learner from ideas supplied by
> AI or by a source. Never later attribute an AI-generated idea to the
> learner.
>
> When useful, revisit meaningful learner-originated ideas and ask the
> learner to defend, revise, reject, extend, or apply them in light of
> later learning.
>
> Treat "AI explained this" and "the learner demonstrated understanding
> of this" as different states.
>
> Use graduated assistance: prompt, focused attention, hint, stronger
> hint, partial explanation, full explanation.
>
> The goal is not to minimize AI assistance. The goal is to maximize
> meaningful human thinking while providing the assistance necessary for
> successful Torah learning.

------------------------------------------------------------------------

## 13. Product Principle

The system should not attempt to answer:

> "How much AI did this person use?"

Instead, its design should continually support the more useful question:

> **"How much thinking did this person do?"**

### Guiding statement

> **AI does not replace the chavrusa's mind. It creates more
> opportunities for the chavrusa to use it.**

------------------------------------------------------------------------

## 14. Initial MVP Recommendation

For the first implementation, prioritize these four capabilities:

1.  **Intent classification** --- identify ideas, questions, confusion,
    and direct answer requests.
2.  **Learner-idea storage** --- save meaningful user-originated
    interpretations separately from AI content.
3.  **Graduated assistance** --- prompt → hint → explanation based on
    learner need.
4.  **Ownership revisit** --- retrieve an earlier learner idea when
    later material makes it relevant.

Do not initially over-engineer scoring or attempt to calculate a
numerical "ownership percentage."

The first goal is to make the conversational behavior reliably
human-first. More advanced analytics can be added after the learning
loop works naturally.
