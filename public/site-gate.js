/* ============================================================
   Raum & Resonanz — Zugangssperre (Vorschau-Phase)
   ------------------------------------------------------------
   Einfacher, markengerechter Passwortschutz für ALLE Seiten.

   HINWEIS: Dies ist eine reine Browser-Sperre für die Vorschau.
   Sie hält normale Besucher zuverlässig fern, ist aber KEIN
   echter Schutz — technisch versierte Personen können das
   Passwort im Quelltext finden. Für echte Sicherheit später
   serverseitigen Schutz beim Hoster/Deployment einrichten.
   ============================================================ */
(function () {
  "use strict";

  var PASSWORD = "IchLiebeHockey:-D";
  var KEY = "rr-unlocked";

  // Bereits freigeschaltet? Dann nichts tun.
  try {
    if (localStorage.getItem(KEY) === "1") return;
  } catch (e) {}

  // Inhalt sofort verbergen (vor dem ersten Rendern), um kein
  // kurzes Aufblitzen der Seite zu erlauben.
  var hideStyle = document.createElement("style");
  hideStyle.id = "rr-gate-hide";
  hideStyle.textContent =
    "html.rr-locked body{visibility:hidden!important;}" +
    "html.rr-locked{overflow:hidden!important;}";
  (document.head || document.documentElement).appendChild(hideStyle);
  document.documentElement.classList.add("rr-locked");

  function buildGate() {
    var css = document.createElement("style");
    css.textContent = [
      "#rr-gate{position:fixed;inset:0;z-index:99999;display:flex;",
      "align-items:center;justify-content:center;padding:24px;",
      "visibility:visible;font-family:'EB Garamond',Georgia,serif;",
      "background:radial-gradient(120% 120% at 30% 20%,#4B275F 0%,#3A1E50 55%,#34194A 100%);",
      "color:#F6EFE6;}",
      "#rr-gate .veil{position:absolute;inset:0;overflow:hidden;}",
      "#rr-gate .orb{position:absolute;border-radius:50%;filter:blur(46px);opacity:.5;}",
      "#rr-gate .orb.a{width:340px;height:340px;left:-60px;top:-40px;background:rgba(190,150,205,.5);}",
      "#rr-gate .orb.b{width:300px;height:300px;right:-50px;bottom:-30px;background:rgba(216,188,138,.42);}",
      "#rr-gate .card{position:relative;width:min(440px,100%);text-align:center;}",
      "#rr-gate .mark{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;",
      "letter-spacing:.16em;text-transform:uppercase;font-size:.84rem;color:#D8BC8A;margin-bottom:26px;}",
      "#rr-gate h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;",
      "font-size:clamp(2rem,6vw,2.9rem);line-height:1.12;color:#fff;margin:0 0 14px;}",
      "#rr-gate p{color:rgba(246,239,230,.78);font-size:1.08rem;line-height:1.55;margin:0 auto 30px;max-width:34ch;}",
      "#rr-gate form{display:flex;flex-direction:column;gap:14px;align-items:stretch;}",
      "#rr-gate .field{position:relative;}",
      "#rr-gate input{width:100%;box-sizing:border-box;padding:15px 18px;font-size:1.08rem;",
      "font-family:inherit;color:#fff;background:rgba(255,255,255,.08);",
      "border:1px solid rgba(216,188,138,.4);border-radius:999px;outline:none;text-align:center;",
      "transition:border-color .3s,background .3s;}",
      "#rr-gate input::placeholder{color:rgba(246,239,230,.5);}",
      "#rr-gate input:focus{border-color:#D8BC8A;background:rgba(255,255,255,.13);}",
      "#rr-gate button{padding:14px 18px;font-size:1.05rem;font-family:'Cormorant Garamond',Georgia,serif;",
      "font-weight:600;letter-spacing:.04em;color:#3A1E50;background:#D8BC8A;",
      "border:0;border-radius:999px;cursor:pointer;transition:transform .25s,box-shadow .25s,background .25s;",
      "box-shadow:0 10px 28px -12px rgba(0,0,0,.5);}",
      "#rr-gate button:hover{background:#E6CEA1;transform:translateY(-1px);}",
      "#rr-gate .err{min-height:1.4em;color:#F2C8C8;font-style:italic;font-size:.98rem;",
      "opacity:0;transition:opacity .25s;}",
      "#rr-gate .err.show{opacity:1;}",
      "#rr-gate.shake .card{animation:rrshake .42s;}",
      "@keyframes rrshake{10%,90%{transform:translateX(-2px);}30%,70%{transform:translateX(6px);}",
      "50%{transform:translateX(-8px);}}",
      "#rr-gate .note{margin-top:26px;font-size:.84rem;color:rgba(246,239,230,.5);font-style:italic;}"
    ].join("");
    document.head.appendChild(css);

    var gate = document.createElement("div");
    gate.id = "rr-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-label", "Zugang geschützt");
    gate.innerHTML =
      '<div class="veil"><span class="orb a"></span><span class="orb b"></span></div>' +
      '<div class="card">' +
        '<div class="mark">Raum &amp; Resonanz</div>' +
        '<h1>Ein Raum im Entstehen</h1>' +
        '<p>Diese Seite befindet sich noch in Vorbereitung. Bitte gib das Zugangswort ein.</p>' +
        '<form autocomplete="off">' +
          '<div class="field">' +
            '<input type="password" name="rr-pass" placeholder="Zugangswort" ' +
            'aria-label="Zugangswort" autofocus />' +
          '</div>' +
          '<button type="submit">Eintreten</button>' +
          '<div class="err" aria-live="polite"></div>' +
        '</form>' +
        '<div class="note">Vorschau · nicht öffentlich</div>' +
      '</div>';
    document.body.appendChild(gate);

    var form = gate.querySelector("form");
    var input = gate.querySelector("input");
    var err = gate.querySelector(".err");

    function unlock() {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      var hs = document.getElementById("rr-gate-hide");
      if (hs) hs.remove();
      document.documentElement.classList.remove("rr-locked");
      gate.style.transition = "opacity .5s ease";
      gate.style.opacity = "0";
      setTimeout(function () { gate.remove(); }, 520);
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (input.value === PASSWORD) {
        unlock();
      } else {
        err.textContent = "Das Zugangswort stimmt nicht ganz. Versuch es noch einmal.";
        err.classList.add("show");
        gate.classList.remove("shake");
        void gate.offsetWidth; // Reflow erzwingen, damit die Animation neu startet
        gate.classList.add("shake");
        input.select();
      }
    });

    setTimeout(function () { input.focus(); }, 60);
  }

  if (document.body) {
    buildGate();
  } else {
    document.addEventListener("DOMContentLoaded", buildGate);
  }
})();
