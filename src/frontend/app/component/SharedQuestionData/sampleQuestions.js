// Local fallback data used only when the backend has no data yet / is
// unreachable, so both pages remain testable in isolation. Once real
// positions and questions exist in the backend, these fallbacks simply
// stop being used (they only kick in when a fetch fails or returns empty).

export const samplePositions = [
  "Back-end Developer",
  "Front-end Developer",
  "Prompt Engineer",
  "Data Engineer",
];

export const sampleQuestionBank = {
  "Back-end Developer": [
    {
      questionId: "sample-be-1",
      content:
        "In a high-concurrency Java application, how would you implement a custom cache mechanism that ensures thread safety without causing severe performance bottlenecks like synchronized blocks do?",
      difficultyLevel: "HARD",
      suggestionAnswer:
        "Use a concurrent hash-based cache with computeIfAbsent and segmented locking, or a lock-free structure backed by ConcurrentHashMap and AtomicReference for the metadata, so only hot entry updates are contended.",
    },
    {
      questionId: "sample-be-2",
      content:
        "How would you design a secure REST API authentication flow for a mobile client while preventing token theft and replay attacks?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Issue short-lived access tokens, pair them with securely stored refresh tokens, use HTTPS only, rotate refresh tokens on each use, and validate client metadata plus token binding when possible.",
    },
    {
      questionId: "sample-be-3",
      content:
        "Explain a strategy to handle graceful degradation in a distributed microservice system when one service becomes unavailable.",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Use circuit breakers, fallback responses, bulkheads, and request timeouts while surfacing degraded state to the client clearly so the system can continue with reduced functionality.",
    },
    {
      questionId: "sample-be-4",
      content:
        "What caching invalidation strategy would you use for a read-heavy microservice with frequent updates to a subset of data?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Combine time-based expiry for stale data with event-driven invalidation for updated entities, ensuring hot keys stay fresh and stale content is removed quickly.",
    },
    {
      questionId: "sample-be-5",
      content:
        "How would you monitor a distributed backend system to detect a slow service before it affects user experience?",
      difficultyLevel: "EASY",
      suggestionAnswer:
        "Use latency-based SLIs, distributed tracing, synthetic checks, and alerting on tail latency while correlating traces with error rate and saturation.",
    },
  ],
  "Front-end Developer": [
    {
      questionId: "sample-fe-1",
      content:
        "What is the best way to minimize repaints in a large single-page app while preserving smooth interactions?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Limit layout-triggering operations, use CSS transforms for animations, separate offscreen rendering work into web workers, and batch DOM updates to reduce paint churn.",
    },
    {
      questionId: "sample-fe-2",
      content:
        "How would you structure CSS for a component library shared across multiple products?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Use atomic utility classes, tokens for spacing and color, a theme layer for design tokens, and isolate component styles with CSS Modules or shadow DOM to avoid cascading issues.",
    },
    {
      questionId: "sample-fe-3",
      content:
        "How would you build an accessible dropdown component that works well on both keyboard and touch?",
      difficultyLevel: "EASY",
      suggestionAnswer:
        "Use keyboard-friendly focus management, ARIA roles, and a touch-friendly hit area, while ensuring the component degrades gracefully when JS is unavailable.",
    },
    {
      questionId: "sample-fe-4",
      content:
        "What pattern would you follow for synchronizing client state with a remote API in a React app?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Use a cache layer with stale-while-revalidate semantics, optimistic UI updates, and error handling that gracefully reverts changes if the API call fails.",
    },
    {
      questionId: "sample-fe-5",
      content:
        "How would you keep a component tree performant when many inputs update rapidly?",
      difficultyLevel: "HARD",
      suggestionAnswer:
        "Isolate state locally, memoize expensive render paths, use virtualization for long lists, and debounce inputs when appropriate.",
    },
  ],
  "Prompt Engineer": [
    {
      questionId: "sample-pe-1",
      content:
        "How do you test a prompt to make sure it is robust across different model versions?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Use a suite of benchmark examples, validate output formats, compare behavior across models, and add guard clauses with explicit instructions to reduce version-specific drift.",
    },
    {
      questionId: "sample-pe-2",
      content:
        "What is a reliable way to prevent a large language model from generating unsafe content in a production system?",
      difficultyLevel: "HARD",
      suggestionAnswer:
        "Use layered controls: prompt safety instructions, system-level filters, post-generation classifiers, and human review for edge cases.",
    },
    {
      questionId: "sample-pe-3",
      content:
        "How would you convert a vague business request into a reliable model prompt?",
      difficultyLevel: "EASY",
      suggestionAnswer:
        "Clarify the objective, define input/output constraints, provide examples, and refine the prompt through iterative validation.",
    },
    {
      questionId: "sample-pe-4",
      content:
        "How do you measure whether a prompt is producing useful, consistent results?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Define success metrics, run the prompt against a validation set, compare output quality across versions, and track drift over time.",
    },
    {
      questionId: "sample-pe-5",
      content:
        "What would you do if the same prompt returned inconsistent answers from the same model?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Tighten the prompt, add explicit constraints, add examples, and reduce stochasticity by fixing parameters like temperature.",
    },
  ],
  "Data Engineer": [
    {
      questionId: "sample-de-1",
      content:
        "How would you maintain data quality in a large ETL pipeline that runs every hour?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Add row-level validation, schema checks, drift detection, and systematic alerting for missing values or unexpected cardinalities.",
    },
    {
      questionId: "sample-de-2",
      content:
        "What strategy would you use for joining streaming and batch data sources?",
      difficultyLevel: "HARD",
      suggestionAnswer:
        "Use a wide-table stateful stream join with windows and watermarks, and keep batch snapshots for late-arriving state in the stream processor.",
    },
    {
      questionId: "sample-de-3",
      content:
        "How would you design a schema for a time-series analytics dataset with millions of daily rows?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Use partitioned storage, compress older segments, keep a narrow event schema, and pre-aggregate frequently queried dimensions.",
    },
    {
      questionId: "sample-de-4",
      content:
        "What approach would you use to detect data drift in a streaming ingestion pipeline?",
      difficultyLevel: "MEDIUM",
      suggestionAnswer:
        "Compare distribution snapshots over time, validate schema evolution, and alert on sudden spikes in nulls or cardinality changes.",
    },
    {
      questionId: "sample-de-5",
      content:
        "How would you ensure a data pipeline recovers cleanly after a failed batch job?",
      difficultyLevel: "EASY",
      suggestionAnswer:
        "Use idempotent writes, checkpointed state, replayable inputs, and clear rollback procedures for incomplete batches.",
    },
  ],
};

// Finds the closest matching sample category for freeform typed text.
// Tries exact match first, then substring match either direction, and
// finally falls back to a small mixed set so the UI never ends up empty.
export const getFallbackQuestions = (positionQuery, difficulty, numQuestions = 10) => {
  const query = (positionQuery || "").trim().toLowerCase();

  let pool =
    sampleQuestionBank[positionQuery] ||
    Object.entries(sampleQuestionBank).find(
      ([key]) =>
        key.toLowerCase().includes(query) || query.includes(key.toLowerCase()),
    )?.[1];

  if (!pool) {
    // last resort: mix one question from each category
    pool = Object.values(sampleQuestionBank).map((list) => list[0]);
  }

  const filtered =
    difficulty && difficulty !== "MIXED"
      ? pool.filter((q) => q.difficultyLevel === difficulty)
      : pool;

  const finalPool = filtered.length > 0 ? filtered : pool;
  return finalPool.slice(0, numQuestions);
};

export const getFallbackPositionSuggestions = (query) => {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return samplePositions.filter((name) => name.toLowerCase().includes(q));
};