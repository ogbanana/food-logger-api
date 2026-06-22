import styles from "./page.module.css";

const endpoints = [
  { method: "POST", path: "/api/auth/signup", desc: "Create an account" },
  { method: "POST", path: "/api/auth/login", desc: "Log in, receive a token" },
  { method: "POST", path: "/api/analyze", desc: "Log food from free text" },
  { method: "GET", path: "/api/logs", desc: "List recent daily logs" },
  { method: "GET", path: "/api/logs/[date]", desc: "Fetch one day's log" },
  { method: "PATCH", path: "/api/logs/[date]", desc: "Edit a meal" },
  { method: "DELETE", path: "/api/logs/[date]", desc: "Remove a meal" },
  { method: "POST", path: "/api/logs/[date]/edit", desc: "Propose an AI edit" },
  { method: "PUT", path: "/api/logs/[date]/edit", desc: "Save an edited day" },
  { method: "GET", path: "/api/usage", desc: "Check daily usage" },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>API · Backend service</span>
          <h1>food-logger-api</h1>
          <p>
            A conversational food-logging backend. Describe what you ate in
            plain language and an LLM parses it into meals with calorie and
            macro estimates, persisted per user per day.
          </p>
          <p className={styles.note}>
            This is a JSON API with no user interface. Send authenticated
            requests to the endpoints below.
          </p>
        </div>

        <section className={styles.endpoints} aria-label="API endpoints">
          {endpoints.map(e => (
            <div className={styles.endpoint} key={`${e.method} ${e.path}`}>
              <span className={styles.method} data-method={e.method}>
                {e.method}
              </span>
              <code className={styles.path}>{e.path}</code>
              <span className={styles.desc}>{e.desc}</span>
            </div>
          ))}
        </section>

        <footer className={styles.footer}>
          <span>Next.js · Postgres · Gemini + Claude</span>
        </footer>
      </main>
    </div>
  );
}
