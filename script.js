(() => {
  "use strict";
  const API_BASE = "http://127.0.0.1:8000"; // must match the port you run uvicorn on

  const $ = (id) => document.getElementById(id);
  const form = $("predict-form"),
    btn = $("submit-btn");
  const sun = $("sun"),
    skyTop = $("skyTop"),
    skyBot = $("skyBot");
  const resultEl = $("result"),
    idleEl = $("idle-msg"),
    errEl = $("error");

  // ---- stars (fade out as the sun rises) ----
  const stars = $("stars");
  for (let i = 0; i < 26; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", ((((Math.sin(i * 12.9898) * 43758) % 1) + 1) % 1) * 300);
    c.setAttribute("cy", ((((Math.sin(i * 78.233) * 12345) % 1) + 1) % 1) * 120);
    c.setAttribute("r", i % 4 ? 0.9 : 1.5);
    c.setAttribute("opacity", 0.8);
    stars.appendChild(c);
  }

  // ---- sky colours: night (score 0) -> morning (score 10) ----
  const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  const css = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();
  const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const sky = () => ({
    topA: toRgb(css("--sky-top-a")),
    topB: toRgb(css("--sky-top-b")),
    botA: toRgb(css("--sky-bot-a")),
    botB: toRgb(css("--sky-bot-b")),
  });

  function setSky(score) {
    const S = sky();
    const t = Math.max(0, Math.min(10, score)) / 10;
    skyTop.setAttribute("stop-color", hex(lerp(S.topA, S.topB, t)));
    skyBot.setAttribute("stop-color", hex(lerp(S.botA, S.botB, t)));
    sun.style.transform = `translate(150px, ${(215 - t * 150).toFixed(0)}px)`;
    stars.querySelectorAll("circle").forEach((c) => (c.style.opacity = Math.max(0, 1 - t * 1.6)));
  }
  setSky(0);

  // ---- sliders: live value + filled track ----
  document.querySelectorAll('input[type="range"]').forEach((r) => {
    const out = document.querySelector(`output[data-for="${r.id}"]`);
    const paint = () => {
      out.textContent = `${parseFloat(r.value).toFixed(1)} h`;
      r.style.setProperty("--p", `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
    };
    r.addEventListener("input", paint);
    paint();
  });

  // ---- stress segmented control ----
  const stressInput = $("stress_level");
  document.querySelectorAll(".seg").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg").forEach((x) => {
        x.classList.remove("on");
        x.setAttribute("aria-checked", "false");
      });
      b.classList.add("on");
      b.setAttribute("aria-checked", "true");
      stressInput.value = b.dataset.value;
      clearErr(stressInput);
    }),
  );

  // ---- validation helpers ----
  const wrap = (el) => el.closest(".field");
  function setErr(el, msg) {
    const w = wrap(el);
    if (!w) return;
    w.classList.add("bad");
    w.querySelector(".error-msg").textContent = msg;
  }
  function clearErr(el) {
    const w = wrap(el);
    if (w) w.classList.remove("bad");
  }
  form
    .querySelectorAll("input,select")
    .forEach((el) =>
      ["input", "change"].forEach((ev) => el.addEventListener(ev, () => clearErr(el))),
    );

  function payload() {
    const v = (k) => form.elements[k].value;
    const n = (k, f) => (v(k) === "" ? NaN : f(v(k)));
    return {
      age: n("age", (x) => parseInt(x, 10)),
      gender: v("gender"),
      country: v("country").trim(),
      academic_level: v("academic_level"),
      most_used_platform: v("most_used_platform"),
      purpose_of_use: v("purpose_of_use"),
      avg_daily_usage_hours: n("avg_daily_usage_hours", parseFloat),
      daily_unlocks: n("daily_unlocks", (x) => parseInt(x, 10)),
      study_hours: n("study_hours", parseFloat),
      physical_activity_hours: n("physical_activity_hours", parseFloat),
      sleep_hours_per_night: n("sleep_hours_per_night", parseFloat),
      stress_level: v("stress_level"),
    };
  }

  function validate(p) {
    const bad = [];
    if (Number.isNaN(p.age) || p.age < 10 || p.age > 100)
      bad.push(["age", "Enter an age from 10 to 100."]);
    if (Number.isNaN(p.daily_unlocks) || p.daily_unlocks < 0)
      bad.push(["daily_unlocks", "Enter 0 or more."]);
    ["gender", "country", "academic_level", "most_used_platform", "purpose_of_use"].forEach((k) => {
      if (!p[k]) bad.push([k, "Choose or enter a value."]);
    });
    if (!p.stress_level) bad.push(["stress_level", "Pick a stress level."]);
    return bad;
  }

  // ---- result copy ----
  function band(s) {
    if (s < 4)
      return [
        "Running low",
        "Your habits point to a strained stretch. Small changes to sleep or screen time can help.",
      ];
    if (s < 7) return ["Steady", "Your routine looks fairly balanced, with room to recover."];
    return ["Bright", "Your habits point to a well-supported baseline. Keep it going."];
  }

  function nudges(p) {
    const out = [];
    if (p.sleep_hours_per_night < 6.5)
      out.push("You're sleeping under 6.5 hours. Sleep is usually the biggest lever.");
    if (p.avg_daily_usage_hours > 6)
      out.push("Screen time is over 6 hours a day. Trimming an hour is a good first step.");
    if (p.physical_activity_hours < 0.5)
      out.push("Under 30 minutes of movement a day. A short walk counts.");
    if (p.daily_unlocks > 100) out.push("Over 100 unlocks a day suggests frequent phone checking.");
    if (["High", "Very High"].includes(p.stress_level))
      out.push("Stress is high. Talk to a friend, mentor, or counsellor.");
    return out.slice(0, 3);
  }

  function show(which, text) {
    resultEl.hidden = which !== "result";
    idleEl.hidden = which !== "idle";
    errEl.hidden = which !== "error";
    if (which === "error") errEl.textContent = text;
  }

  function render(score, p) {
    const [label, ctx] = band(score);
    $("score-number").textContent = score.toFixed(2);
    $("score-band").textContent = label;
    $("score-context").textContent = ctx;
    $("nudges").innerHTML = nudges(p)
      .map((t) => `<li>${t}</li>`)
      .join("");
    show("result");
    setSky(score);
  }

  // ---- submit ----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("bad"));
    const p = payload(),
      bad = validate(p);
    if (bad.length) {
      bad.forEach(([k, m]) => setErr($(k), m));
      const first = $(bad[0][0]);
      if (first.type !== "hidden") first.focus();
      return;
    }
    btn.disabled = true;
    btn.classList.add("loading");
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (res.status === 422) {
        const body = await res.json().catch(() => null);
        let matched = false;
        (body?.detail || []).forEach((d) => {
          const el = $(d.loc?.[d.loc.length - 1]);
          if (el) {
            setErr(el, d.msg);
            matched = true;
          }
        });
        return show(
          "error",
          matched
            ? "The API rejected some fields. They're marked in the form."
            : "The API rejected this submission. Check your inputs.",
        );
      }
      if (!res.ok)
        return show(
          "error",
          `The API returned status ${res.status}. Check the uvicorn terminal for the traceback.`,
        );
      const data = await res.json();
      if (typeof data.predicted_mental_health_score !== "number")
        return show("error", "The API replied without a valid score.");
      render(data.predicted_mental_health_score, p);
    } catch {
      show(
        "error",
        `Can't reach ${API_BASE}. Start the backend with: uvicorn main:app --port 8000 --reload`,
      );
    } finally {
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  });
})();