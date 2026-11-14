export function createUI() {
 document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
 <main id="game" aria-label="The White Signal game">
  <div id="viewport"></div><div class="vignette"></div><div class="grain"></div>
  <header class="topbar"><a class="brand" href="./" aria-label="The White Signal home"><span class="brand-mark">W<span>Ⅰ</span></span><span>THE WHITE SIGNAL<small data-i18n="AN ANTARCTIC MYSTERY">AN ANTARCTIC MYSTERY</small></span></a>
   <div class="chapter"><span class="live-dot"></span><span id="chapterText">CHAPTER 01 / THE ARRIVAL</span></div>
   <nav aria-label="Game menu"><button id="mapButton" aria-label="Expedition map" title="Expedition map (M)"><span class="nav-icon">◇</span><span class="nav-label" data-i18n="MAP">MAP</span></button><button id="journalButton" title="Field notes (J)"><span class="nav-icon">▤</span><span class="nav-label" data-i18n="FIELD NOTES">FIELD NOTES</span><span class="unread">1</span></button><button id="soundButton" aria-label="Enable audio" title="Toggle sound">♪<span class="nav-label" id="soundLabel">SOUND OFF</span></button><button id="pauseButton" aria-label="Pause game" title="Pause (Esc)">Ⅱ</button></nav>
  </header>
  <section class="location"><div class="eyebrow"><span class="tiny-line"></span> 78°24′ S &nbsp; 106°42′ E</div><h1 id="locationTitle">KESTREL STATION</h1><p><span data-i18n="ANTARCTICA">ANTARCTICA</span> <span>·</span> <span data-i18n="AUGUST 17, 1987">AUGUST 17, 1987</span></p><div class="weather"><span class="snowflake">❄</span> −38°C <i></i> <span data-i18n="WIND 42 KM/H">WIND 42 KM/H</span> <span class="weather-tag" data-i18n="WHITEOUT">WHITEOUT</span></div></section>
  <div class="world-caption" id="worldCaption"><span>04</span><div><span data-i18n="KESTREL RESEARCH OUTPOST">KESTREL RESEARCH OUTPOST</span><small data-i18n="LAST CONTACT: 03:14 UTC">LAST CONTACT: 03:14 UTC</small></div></div>
  <div class="scene-label"><span></span> <span id="sceneLabel">EXTERIOR · APPROACH</span></div>
  <div id="interact" class="interact" hidden><button id="interactButton"><kbd>E</kbd><span id="interactText">Enter station</span><span>↗</span></button></div>
  <div id="toast" role="status"></div><div id="caption" aria-live="polite"></div><div id="titleCard" aria-hidden="true"><small id="titleCardNumber"></small><strong id="titleCardTitle"></strong></div>
  <footer class="hud"><div class="status"><div class="scientist-icon">✚</div><div><div class="eyebrow" data-i18n="DR. ELIAS VOSS">DR. ELIAS VOSS</div><div class="field-meters" id="fieldMeters" hidden>
    <div class="field-meter"><label for="warmth" data-i18n="WARMTH">WARMTH</label><meter id="warmth" min="0" max="100" low="25" optimum="100" value="100"></meter><span id="warmthValue">100%</span></div>
    <div class="field-meter"><label for="attention" data-i18n="EXPOSURE">EXPOSURE</label><meter id="attention" min="0" max="100" high="55" optimum="0" value="0"></meter><span id="attentionValue">QUIET</span></div>
    <div class="field-meter"><label for="battery" data-i18n="BATTERY">BATTERY</label><meter id="battery" min="0" max="100" low="20" optimum="100" value="100"></meter><span id="batteryValue">100%</span></div>
   </div><div class="equipment"><span id="flashState">◉ FLASHLIGHT ON</span><span id="evidenceCount">EVIDENCE 0/8</span></div></div></div>
  <div class="objective"><span class="objective-mark">◇</span><div><div class="eyebrow" data-i18n="CURRENT OBJECTIVE">CURRENT OBJECTIVE</div><p id="objectiveText">Reach the research station</p><small id="objectiveRoute"></small><small id="objectiveDistance"></small></div><span class="objective-arrow" id="objectiveArrow" aria-hidden="true">→</span></div><div class="save-state"><span id="saveDot">◇</span><div><span data-i18n="LOCAL CHECKPOINT">LOCAL CHECKPOINT</span><small id="saveLabel">PROGRESS SAVED AUTOMATICALLY</small></div></div></footer>
  <div class="desktop-controls"><span><kbd data-key="up">W</kbd><kbd data-key="left">A</kbd><kbd data-key="down">S</kbd><kbd data-key="right">D</kbd> <span data-i18n="MOVE">MOVE</span></span><span><kbd data-key="run">SHIFT</kbd> <span data-i18n="RUN">RUN</span></span><span><kbd data-key="jump">SPACE</kbd> <span data-i18n="JUMP">JUMP</span></span><span><kbd data-key="flashlight">F</kbd> <span data-i18n="FLASHLIGHT">FLASHLIGHT</span></span><span><kbd data-key="interact">E</kbd> <span data-i18n="INTERACT">INTERACT</span></span></div>
  <div class="slice-label"><span id="elapsed">00:00</span> <span data-i18n="ACTIVE TIME">ACTIVE TIME</span></div>
  <div class="touch-controls"><div class="touch-move" role="group" aria-label="Movement">
    <button class="move-up" data-control="up" aria-label="Move up">↑</button>
    <button class="move-left" data-control="left" aria-label="Move left">←</button>
    <button class="move-down" data-control="down" aria-label="Move down">↓</button>
    <button class="move-right" data-control="right" aria-label="Move right">→</button>
  </div><div class="touch-actions"><button data-control="run" aria-label="Hold to run" data-i18n="RUN">RUN</button><button data-control="flashlight" aria-label="Toggle flashlight">☀</button><button data-control="jump" aria-label="Jump">⤒</button><button data-control="interact" id="touchAction" aria-label="Interact" disabled>USE</button></div></div>
  <section id="dialogue" class="dialogue" hidden aria-label="Dialogue"><div class="transmission-top"><span class="live-dot"></span><span id="dialogueTag">INCOMING TRANSMISSION</span></div><div class="waveform">${Array.from({length:48},(_,i)=>`<i style="--h:${12+Math.sin(i*2.3)*9+Math.cos(i)*5}px;--d:${i*.04}s"></i>`).join('')}</div><div class="speaker" id="speaker">UNKNOWN VOICE</div><p id="dialogueText" aria-live="polite"></p><button id="nextDialogue">CONTINUE <kbd>E</kbd> →</button></section>
  <div id="whiteout" aria-hidden="true"></div>
  <div id="puzzle" class="overlay" hidden>
   <section class="panel encounter" role="dialog" aria-modal="true" aria-labelledby="encounterTitle">
    <div class="eyebrow" id="encounterTag" data-i18n="KESTREL / FIELD SYSTEMS">KESTREL / FIELD SYSTEMS</div>
    <h2 id="encounterTitle"></h2><p id="encounterHint"></p>
    <div class="sequence" id="sequence"></div>
    <p id="puzzleFeedback" role="status"></p>
    <div class="encounter-choices" id="choices"></div>
    <button id="exitPuzzle" class="text-button" data-i18n="STEP BACK · ESC">STEP BACK · ESC</button>
   </section>
  </div>
  <div id="overlay" class="overlay" hidden><section class="panel"><div class="eyebrow">THE WHITE SIGNAL</div><h2 id="panelTitle">Expedition paused</h2><div id="panelContent"></div><div id="panelActions"></div><button class="primary" id="resumeButton"><span data-i18n="RESUME EXPEDITION">RESUME EXPEDITION</span> <span>→</span></button><button id="restartButton" class="text-button" data-i18n="RESTART EXPEDITION">RESTART EXPEDITION</button></section></div>
 </main>`;
}
export const el = <T extends HTMLElement=HTMLElement>(id:string) => document.getElementById(id) as T;
