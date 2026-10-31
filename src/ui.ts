export function createUI() {
 document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
 <main id="game" aria-label="The White Signal game">
  <div id="viewport"></div><div class="vignette"></div><div class="grain"></div>
  <header class="topbar"><a class="brand" href="./" aria-label="The White Signal home"><span class="brand-mark">W<span>Ⅰ</span></span><span>THE WHITE SIGNAL<small>AN ANTARCTIC MYSTERY</small></span></a>
   <div class="chapter"><span class="live-dot"></span> CHAPTER 01 <i>/</i> THE ARRIVAL</div>
   <nav aria-label="Game menu"><button id="journalButton" title="Field notes (J)"><span class="nav-icon">▤</span><span class="nav-label">FIELD NOTES</span><span class="unread">1</span></button><button id="soundButton" aria-label="Enable audio" title="Toggle sound">♪<span class="nav-label" id="soundLabel">SOUND OFF</span></button><button id="pauseButton" aria-label="Pause game" title="Pause (Esc)">Ⅱ</button></nav>
  </header>
  <section class="location"><div class="eyebrow"><span class="tiny-line"></span> 78°24′ S &nbsp; 106°42′ E</div><h1>KESTREL STATION</h1><p>ANTARCTICA <span>·</span> AUGUST 17, 1987</p><div class="weather"><span class="snowflake">❄</span> −38°C <i></i> WIND 42 KM/H <span class="weather-tag">WHITEOUT</span></div></section>
  <div class="world-caption" id="worldCaption"><span>04</span><div>KESTREL RESEARCH OUTPOST<small>LAST CONTACT: 03:14 UTC</small></div></div>
  <div class="scene-label"><span></span> <span id="sceneLabel">EXTERIOR · APPROACH</span></div>
  <div id="interact" class="interact" hidden><button id="interactButton"><kbd>E</kbd><span id="interactText">Enter station</span><span>↗</span></button></div>
  <div id="toast" role="status"></div>
  <footer class="hud"><div class="status"><div class="scientist-icon">✚</div><div><div class="eyebrow">DR. ELIAS VOSS</div><div class="health-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><span>STABLE</span></div><div class="equipment"><span id="flashState">◉ FLASHLIGHT ON</span><span>▰ BATTERY 86%</span></div></div></div>
  <div class="objective"><span class="objective-mark">◇</span><div><div class="eyebrow">CURRENT OBJECTIVE</div><p id="objectiveText">Reach the research station</p></div><span class="objective-arrow">→</span></div><div class="save-state"><span id="saveDot">◇</span><div>LOCAL CHECKPOINT<small id="saveLabel">PROGRESS SAVED AUTOMATICALLY</small></div></div></footer>
  <div class="desktop-controls"><span><kbd>A</kbd><kbd>D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>F</kbd> FLASHLIGHT</span><span><kbd>E</kbd> INTERACT</span></div>
  <div class="slice-label">PLAYABLE PROLOGUE <span>v0.1</span></div>
  <div class="touch-controls"><div class="touch-move"><button data-control="KeyA" aria-label="Move left">←</button><button data-control="KeyD" aria-label="Move right">→</button></div><div class="touch-actions"><button data-control="ShiftLeft" aria-label="Hold to run">RUN</button><button data-control="KeyF" aria-label="Toggle flashlight">☀</button><button data-control="Space" aria-label="Jump">↑</button><button data-control="KeyE" id="touchAction" aria-label="Interact" disabled>USE</button></div></div>
  <section id="dialogue" class="dialogue" hidden aria-label="Radio transmission"><div class="transmission-top"><span class="live-dot"></span> INCOMING TRANSMISSION <span>87.6 MHz</span></div><div class="waveform">${Array.from({length:48},(_,i)=>`<i style="--h:${12+Math.sin(i*2.3)*9+Math.cos(i)*5}px;--d:${i*.04}s"></i>`).join('')}</div><div class="speaker" id="speaker">UNKNOWN VOICE</div><p id="dialogueText"></p><button id="nextDialogue">CONTINUE <kbd>E</kbd> →</button></section>
  <div id="overlay" class="overlay" hidden><section class="panel"><div class="eyebrow">THE WHITE SIGNAL</div><h2 id="panelTitle">Expedition paused</h2><div id="panelContent"></div><button class="primary" id="resumeButton">RESUME EXPEDITION <span>→</span></button><button id="restartButton" class="text-button">RESTART PROLOGUE</button></section></div>
 </main>`;
}
export const el = <T extends HTMLElement=HTMLElement>(id:string) => document.getElementById(id) as T;
