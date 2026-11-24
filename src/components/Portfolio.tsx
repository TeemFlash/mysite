import turntable from "../../experience/reference-turntable.png";
import heart from "../../experience/faceted-heart.svg";
import { SceneCells } from "./SceneCells";

export function Scene() {
  return (
    <main id="playground" aria-label="Interactive scene">
      <div className="intro-backdrop" aria-hidden="true"></div>
      <section id="heart-scene" aria-hidden="true" hidden>
        <div className="heart-grid" aria-hidden="true"></div>
        <img id="heart-art" src={heart} width="600" height="600" alt="" />
        <div className="heart-orbit orbit-a" aria-hidden="true"></div>
        <div className="heart-orbit orbit-b" aria-hidden="true"></div>
      </section>
      <canvas id="lightning-trail" aria-hidden="true"></canvas>
    </main>
  );
}

export function RecordPlayer() {
  return (
    <>
    <div id="player-shell">
      <div className="desk photo-deck">
        <img
          className="player-photo"
          fetchPriority="high"
          src={turntable}
          width="1147"
          height="890"
          alt="Wooden vinyl record player"
        />
        <div className="logo-patch" aria-hidden="true"></div>
        <div className="rest-plate" aria-hidden="true"></div>
        <div className="rest-wood" aria-hidden="true"></div>
        <div className="rest-speaker" aria-hidden="true"></div>
        <div className="moving-needle" aria-hidden="true">
          <img src={turntable} width="1147" height="890" alt="" />
        </div>
        <div className="record" aria-hidden="true">
          <img
            className="vinyl-photo"
            src={turntable}
            width="1147"
            height="890"
            alt=""
          />
          <div className="record-label">
            <span className="label-artist">
              {"Temirlan"}
              <br />
              {"Zhumakpayev"}
            </span>
            <span className="label-title">{"my life"}</span>
            <i></i>
          </div>
        </div>
        <button
          id="record-control"
          disabled
          className="tonearm"
          aria-label="Start introduction"
          aria-pressed="false"
        ></button>
      </div>
    </div>
    <p className="intro-entry" aria-live="polite">
      <span className="intro-loading">Loading…</span>
      <span className="intro-keyboard">Click anywhere or press any key to start</span>
      <span className="intro-touch">Tap anywhere to start</span>
    </p>
    </>
  );
}

export function LanguageControls() {
  return (
    <div className="scene-controls" hidden>
      <div
        className="language-controls"
        role="group"
        aria-label="Язык / Language"
      >
        <span className="language-selection" aria-hidden="true"></span>
        <button data-lang="ru" aria-label="Русский" aria-pressed="false">
          {"RU"}
        </button>
        <button data-lang="en" aria-label="English" aria-pressed="true">
          {"EN"}
        </button>
      </div>
    </div>
  );
}

export function MusicInfo() {
  return (
    <div className="music-info sr-only" hidden>
      <a
        href="https://music.apple.com/us/album/what-ive-done/590427297?i=590427450&uo=4"
        target="_blank"
        rel="noreferrer"
      >
        {"Linkin Park — What I've Done"}
      </a>
      <span id="music-status" role="status" aria-live="polite"></span>
      <label className="local-track" htmlFor="audio-file" data-t="file">
        {"Открыть аудиофайл"}
      </label>
      <input id="audio-file" type="file" accept="audio/*" className="sr-only" />
    </div>
  );
}

export function Introduction() {
  return (
    <section id="introduction" aria-labelledby="intro-name">
      <div className="intro-heading">
        <h1 id="intro-name">
          <span className="name-copy">
            {"Temirlan"}
            <br />
            {"Zhumakpayev"}
            <span className="name-period">{"."}</span>
          </span>
        </h1>
        <div className="intro-facts">
          <p>{"Software Engineering"}</p>
          <p data-copy="bio">{"Interested in bioengineering"}</p>
        </div>
        <nav className="hero-navigation" aria-label="Explore">
          <span className="nav-highlight" aria-hidden="true"></span>
          <a href="#about" data-profile="about">
            {"About"}
          </a>
          <a href="#skills" data-profile="skills">
            {"Skills"}
          </a>
          <a href="#work" data-copy="projects">
            {"Projects"}
          </a>
          <a href="#contact" data-copy="contact">
            {"Contact"}
          </a>
        </nav>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section
      id="about"
      className="profile-section personal-about"
      aria-labelledby="about-title"
    >
      <div className="about-tunnel">
        <div className="tunnel-stage">
          <div className="tunnel-title">
            <h2 id="about-title" data-profile="about">
              {"About"}
            </h2>
          </div>
          <div className="tunnel-plane">
            <article className="tunnel-card study-card">
              <span data-profile="education">{"Education"}</span>
              <h3>
                {"Software"}
                <br />
                {"Engineering"}
              </h3>
              <p data-profile="degree">
                {"Bachelor’s degree"}
                <br />
                {"Third year"}
              </p>
            </article>
            <article className="tunnel-card bio-card">
              <span data-profile="direction">{"Direction"}</span>
              <h3 data-profile="bioengineering">{"Bioengineering"}</h3>
              <p data-profile="cardiology">{"Cardiology"}</p>
            </article>
            <article className="tunnel-card robot-card">
              <span data-profile="practice">{"Practice"}</span>
              <h3 data-profile="robotics">{"Robotics"}</h3>
              <p>{"Software & hardware"}</p>
            </article>
            <article className="tunnel-card music-card">
              <h3>{"Classic rock"}</h3>
            </article>
            <article className="tunnel-card series-card">
              <h3>{"Supernatural"}</h3>
            </article>
            <article className="tunnel-card flash-card">
              <h3>{"The Flash"}</h3>
            </article>
          </div>
        </div>
      </div>
      <SceneCells />
    </section>
  );
}

export function Skills() {
  return (
    <section
      id="skills"
      className="profile-section"
      aria-labelledby="skills-title"
    >
      <div className="skills-top">
        <h2 id="skills-title" data-profile="skills">
          {"Skills"}
        </h2>
        <div className="skill-tabs" role="tablist" aria-label="Skill areas">
          <span className="skill-indicator" aria-hidden="true"></span>
          <button
            role="tab"
            id="tab-all"
            aria-controls="skill-results"
            aria-selected="true"
            tabIndex={0}
            data-filter="all"
            data-profile="all"
          >
            {"All"}
          </button>
          <button
            role="tab"
            id="tab-backend"
            aria-controls="skill-results"
            aria-selected="false"
            tabIndex={-1}
            data-filter="backend"
          >
            {"Backend"}
          </button>
          <button
            role="tab"
            id="tab-frontend"
            aria-controls="skill-results"
            aria-selected="false"
            tabIndex={-1}
            data-filter="frontend"
          >
            {"Frontend"}
          </button>
          <button
            role="tab"
            id="tab-hardware"
            aria-controls="skill-results"
            aria-selected="false"
            tabIndex={-1}
            data-filter="hardware"
          >
            {"Hardware"}
          </button>
        </div>
      </div>
      <div
        id="skill-results"
        className="skill-grid bento-grid"
        role="tabpanel"
        aria-labelledby="tab-all"
        tabIndex={0}
      >
        <article className="technology-card" data-area="backend">
          <span>{"Backend"}</span>
          <h3>{"Python"}</h3>
          <span className="language-mark" aria-hidden="true">
            {".py"}
          </span>
        </article>
        <article className="technology-card" data-area="frontend">
          <span>{"Frontend"}</span>
          <h3>{"HTML / CSS"}</h3>
          <span className="language-mark" aria-hidden="true">
            {"</>"}
          </span>
        </article>
        <article className="technology-card" data-area="hardware">
          <span>{"Hardware"}</span>
          <h3>{"C++"}</h3>
          <span className="language-mark" aria-hidden="true">
            {"++"}
          </span>
        </article>
      </div>
    </section>
  );
}

export function Projects() {
  return (
    <section id="work" className="work wrap">
      <div className="section-top">
        <h2 data-i18n="selected">{"Проекты"}</h2>
      </div>
      <div className="projects">
        <article className="project featured">
          <button
            className="project-open"
            data-project="pulse"
            type="button"
            aria-label="Открыть демонстрационный проект Pulse"
            data-label="openPulse"
          >
            <div className="project-visual pulse-visual">
              <div className="monitor">
                <div className="monitor-top">
                  <span className="monitor-logo">
                    {"p"}
                    <span>{"●"}</span>
                    {"lse"}
                  </span>
                  <span className="monitor-dot" aria-hidden="true"></span>
                </div>
                <div className="monitor-body">
                  <div>
                    <span className="monitor-label" data-i18n="rhythm">
                      {"Ритм в деталях"}
                    </span>
                    <div className="reading">
                      {"72"}
                      <span>{"bpm"}</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 360 100" aria-hidden="true">
                    <path
                      className="muted-trace"
                      d="M0 58h45l9-9 8 9h25l8-16 9 41 12-73 12 48h32l10-10 12 10h38l8-10 8 10h25l8-16 9 41 12-73 12 48h50"
                    ></path>
                    <path d="M0 58h45l9-9 8 9h25l8-16 9 41 12-73 12 48h32l10-10 12 10h38l8-10 8 10h25l8-16 9 41 12-73 12 48h50"></path>
                  </svg>
                </div>
                <div className="monitor-bottom">
                  <span data-i18n="signal">{"Визуализация сигнала"}</span>
                  <span>{"00:24"}</span>
                </div>
              </div>
              <span className="open-circle" aria-hidden="true">
                {"↗"}
              </span>
            </div>
            <div className="project-text">
              <div>
                <h3>{"Pulse"}</h3>
              </div>
            </div>
          </button>
        </article>
        {"\n"}
        <div className="small-projects">
          <article className="project">
            <button
              className="project-open"
              data-project="motion"
              type="button"
              aria-label="Открыть демонстрационный проект Motion Lab"
              data-label="openMotion"
            >
              <div className="project-visual robot-visual">
                <svg className="robot" viewBox="0 0 400 220" aria-hidden="true">
                  <defs>
                    <pattern
                      id="dots"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1" cy="1" r="1" fill="#c4cbc4"></circle>
                    </pattern>
                  </defs>
                  <rect width="400" height="220" fill="url(#dots)"></rect>
                  <ellipse
                    cx="215"
                    cy="183"
                    rx="90"
                    ry="11"
                    fill="#ced4cb"
                  ></ellipse>
                  <path d="M170 175h90l-13-20h-64z" fill="#8b9b89"></path>
                  <path
                    d="M210 157v-52l-57-46 19-20 65 58v60"
                    fill="#bdc8b9"
                    stroke="#52644f"
                    strokeWidth="2"
                  ></path>
                  <path
                    d="m170 42 79-15 7 25-83 17"
                    fill="#e6e9e0"
                    stroke="#52644f"
                    strokeWidth="2"
                  ></path>
                  <circle
                    cx="168"
                    cy="55"
                    r="17"
                    fill="#a9b7a1"
                    stroke="#52644f"
                    strokeWidth="2"
                  ></circle>
                  <circle cx="168" cy="55" r="6" fill="#52644f"></circle>
                  <circle cx="223" cy="109" r="10" fill="#52644f"></circle>
                  <path
                    d="m252 34 25 7 4 23m-26-17 13 9-2 15"
                    stroke="#52644f"
                    strokeWidth="7"
                    strokeLinecap="round"
                  ></path>
                  <path d="M104 174v-28m-14 14h28" stroke="#a5b29e"></path>
                  <path d="M301 93v-28m-14 14h28" stroke="#a5b29e"></path>
                </svg>
                <span className="open-circle" aria-hidden="true">
                  {"↗"}
                </span>
              </div>
              <div className="project-text">
                <div>
                  <h3>{"Motion Lab"}</h3>
                </div>
              </div>
            </button>
          </article>
          <article className="project">
            <button
              className="project-open"
              data-project="atlas"
              type="button"
              aria-label="Открыть демонстрационный проект Atlas"
              data-label="openAtlas"
            >
              <div className="project-visual atlas-visual">
                <div className="atlas-window" aria-hidden="true">
                  <div className="atlas-sidebar">
                    <b>{"a."}</b>
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>
                  <div className="atlas-main">
                    <span>{"Workspace"}</span>
                    <div className="atlas-bars">
                      <i></i>
                      <i></i>
                      <i></i>
                    </div>
                    <div className="atlas-chart">
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                    </div>
                  </div>
                </div>
                <span className="open-circle" aria-hidden="true">
                  {"↗"}
                </span>
              </div>
              <div className="project-text">
                <div>
                  <h3>{"Atlas"}</h3>
                </div>
              </div>
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section
      id="contact"
      className="contact-section"
      aria-labelledby="contact-heading"
    >
      <h2 id="contact-heading" data-copy="contactHeading">
        {"Contact me"}
      </h2>
      <div className="contact-methods">
        <div className="contact-method" data-method="telegram">
          <button type="button" className="contact-trigger">
            {"Telegram"}
          </button>
          <a
            className="contact-result"
            href="https://t.me/timmy_zhfs"
            target="_blank"
            rel="noopener noreferrer"
            hidden
          >
            {"@timmy_zhfs"}
          </a>
          <div className="contact-transition" aria-hidden="true">
            <span></span>
            <span></span>
          </div>
        </div>
        <div className="contact-method" data-method="email">
          <button type="button" className="contact-trigger">
            {"Email"}
          </button>
          <a
            className="contact-result"
            href="mailto:temirrrlan07@gmail.com"
            hidden
          >
            {"temirrrlan07@gmail.com"}
          </a>
          <div className="contact-transition" aria-hidden="true">
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter id="contact-threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140"
            ></feColorMatrix>
          </filter>
        </defs>
      </svg>
    </section>
  );
}

export function ProjectDialog() {
  return (
    <dialog id="project-dialog" aria-labelledby="project-title">
      <button id="close-project" aria-label="Close">
        {"×"}
      </button>
      <h2 id="project-title"></h2>
      <p id="project-note"></p>
    </dialog>
  );
}

export function AudioTrack() {
  return (
    <audio
      id="track"
      crossOrigin="anonymous"
      preload="none"
      data-start="6.5"
      src="https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/95/90/94/959094df-bf3e-6204-5b97-5cbc4c6242b2/mzaf_7071906531654724628.plus.aac.p.m4a"
    ></audio>
  );
}

export function Announcer() {
  return <div id="announcer" className="sr-only" aria-live="polite"></div>;
}
