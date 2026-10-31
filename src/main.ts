import * as THREE from 'three';
import './style.css';
import { createUI, el } from './ui';
import { Input } from './systems/input';
import { Character } from './systems/character';
import { FollowCamera } from './systems/camera';
import { AudioSystem } from './systems/audio';
import { move } from './systems/movement';
import { loadSave, saveGame, freshSave } from './systems/save';
import { Levels } from './world/levels';

createUI();
const state=loadSave();
let renderer: THREE.WebGLRenderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch { el('viewport').innerHTML='<p style="padding:30vh 10%;position:relative;z-index:20">The White Signal needs WebGL. Please enable hardware acceleration and reload in a supported browser.</p>'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
el('viewport').append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Snow-covered Kestrel Station. Use A and D to move; E to interact.');
const scene=new THREE.Scene();scene.background=new THREE.Color('#152b3b');scene.fog=new THREE.FogExp2('#243f50',.019);
const levels=new Levels(scene), player=new Character(scene), camera=new FollowCamera(), input=new Input(), audio=new AudioSystem();
player.body.x=state.x;
const flashlight=new THREE.SpotLight('#e7e5bc',13,12,.33,.75,1.4);
flashlight.position.set(0,1.2,.5);scene.add(flashlight,flashlight.target);
// A soft additive cone makes the torch readable through the storm.
const coneShape=new THREE.Shape();coneShape.moveTo(0,0);coneShape.lineTo(6,1.25);coneShape.quadraticCurveTo(6.8,0,6,-1.25);coneShape.closePath();
const beam=new THREE.Mesh(new THREE.ShapeGeometry(coneShape),new THREE.MeshBasicMaterial({color:'#dce5b9',transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));scene.add(beam);
let manualPause=false, dialogIndex=-1, activePanel:'pause'|'journal'='pause', accumulator=0, last=performance.now(), saveTimer=0, toastTimer=0, time=0, nearby='';
const lines=[
 ['UNKNOWN VOICE','…Kestrel. Kestrel, do you read?'],
 ['UNKNOWN VOICE','If you can hear this, keep the lights on. Do not follow the figures in the snow.'],
 ['DR. ELIAS VOSS','This is Dr. Voss. I just arrived. Who is transmitting?'],
 ['UNKNOWN VOICE','You arrived three days ago, Doctor.'],
 ['SYSTEM','SIGNAL LOST. Transmission recorded in your field notes.']
];
function toast(message:string){el('toast').textContent=message;el('toast').style.opacity='1';toastTimer=4;}
function persist(){state.x=player.body.x;const ok=saveGame(state);el('saveLabel').textContent=ok?'PROGRESS SAVED AUTOMATICALLY':'LOCAL STORAGE UNAVAILABLE';}
function updateObjective(){el('journalButton').querySelector('.unread')!.textContent=state.heard?'2':'1';el('objectiveText').textContent=state.heard?'Investigate the repeating signal':state.level==='inside'?'Investigate the radio terminal':'Reach the research station';el('flashState').textContent=`◉ FLASHLIGHT ${state.flashlight?'ON':'OFF'}`;el('journalButton').setAttribute('aria-label',`Field notes, ${state.heard?'2':'1'} entries`);}
function changeLevel(initial=false){
 const inside=state.level==='inside';levels.setLevel(inside);
 scene.background=new THREE.Color(inside?'#101c25':'#152b3b');scene.fog=new THREE.FogExp2(inside?'#15232b':'#243f50',inside?.012:.019);
 if(!initial){player.body.x=inside?-6.6:10.2;player.body.y=0;player.body.vy=0;player.body.vx=0;player.body.grounded=true;camera.x=inside?0:8;persist();audio.beep(330);toast(inside?'KESTREL STATION  /  COMMUNICATIONS':'EXTERIOR  /  KEEP THE LIGHTS ON');}
 el('sceneLabel').textContent=inside?'INTERIOR · RADIO ROOM':'EXTERIOR · APPROACH';el('worldCaption').hidden=inside;
 el<HTMLHeadingElement>('game').classList.toggle('indoors',inside);updateObjective();
}
changeLevel(true);
function setPause(paused:boolean,panel:'pause'|'journal'='pause'){
 manualPause=paused;activePanel=panel;input.clear();el('overlay').hidden=!paused;audio.pause(paused||document.hidden);
 el('pauseButton').setAttribute('aria-label',paused?'Resume game':'Pause game');
 if(!paused){last=performance.now();return;}
 el('panelTitle').textContent=panel==='journal'?'Field notes':'Expedition paused';
 el('panelContent').innerHTML=panel==='journal'?`<p class="entry">01 / AUGUST 17, 1987</p><p>Kestrel stopped answering at 03:14. No distress call. Just twelve seconds of white noise. I was sent to find out why.</p>${state.heard?'<p class="entry">02 / THE TRANSMISSION</p><p>“You arrived three days ago, Doctor.” The voice knew my name. The terminal logged the same message at 03:14. Next: trace the source of the repeating signal.</p>':'<p>The station has power. Someone may still be inside. Find the entrance and check the communications terminal.</p>'}`:'<p>The storm can wait a moment.</p><p>A / D or arrows to move · Shift to run<br>Space to jump · F for flashlight<br>E to interact · J for field notes · Esc to pause</p>';
 el('resumeButton').focus();
}
function advanceDialogue(){
 dialogIndex++;
 if(dialogIndex>=lines.length){dialogIndex=-1;el('dialogue').hidden=true;state.heard=true;el('journalButton').querySelector('.unread')!.textContent='2';updateObjective();persist();toast('TRANSMISSION ARCHIVED  /  FIELD NOTES UPDATED');return;}
 el('dialogue').hidden=false;el('speaker').textContent=lines[dialogIndex][0];el('dialogueText').textContent=lines[dialogIndex][1];el('nextDialogue').innerHTML=`${dialogIndex===lines.length-1?'ARCHIVE':'CONTINUE'} <kbd>E</kbd> →`;audio.beep(dialogIndex===3?180:540);
}
function interact(){
 if(manualPause)return;
 audio.start();
 if(dialogIndex>=0){advanceDialogue();return;}
 if(nearby==='entrance'){state.level='inside';changeLevel();}
 else if(nearby==='exit'){state.level='outside';changeLevel();}
 else if(nearby==='terminal'){player.body.vx=0;advanceDialogue();}
}
el('interactButton').addEventListener('click',interact);el('nextDialogue').addEventListener('click',advanceDialogue);
el('pauseButton').addEventListener('click',()=>setPause(!manualPause));
el('journalButton').addEventListener('click',()=>setPause(!(manualPause&&activePanel==='journal'),'journal'));
el('resumeButton').addEventListener('click',()=>setPause(false));
el('soundButton').addEventListener('click',()=>{audio.toggle();el('soundLabel').textContent=audio.muted?'SOUND OFF':'SOUND ON';el('soundButton').setAttribute('aria-label',audio.muted?'Enable audio':'Mute audio');});
el('restartButton').addEventListener('click',()=>{Object.assign(state,freshSave());dialogIndex=-1;el('dialogue').hidden=true;changeLevel();player.body.x=-5;camera.x=-3;el('journalButton').querySelector('.unread')!.textContent='1';persist();setPause(false);toast('AUGUST 17, 1987  /  THE ARRIVAL');});
document.addEventListener('visibilitychange',()=>{input.clear();accumulator=0;last=performance.now();if(document.hidden)persist();audio.pause(document.hidden||manualPause);});
window.addEventListener('pagehide',persist);
window.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Escape'){e.preventDefault();setPause(!manualPause);}if(e.code==='KeyJ'){e.preventDefault();setPause(!(manualPause&&activePanel==='journal'),'journal');}});
function resize(){renderer.setSize(window.innerWidth,window.innerHeight);camera.resize(window.innerWidth,window.innerHeight);}
window.addEventListener('resize',resize);resize();
function fixed(dt:number){
 if(input.pressed('KeyF')){state.flashlight=!state.flashlight;updateObjective();audio.beep(240);}
 if(input.pressed('KeyE','Enter'))interact();
 if(dialogIndex<0){move(player.body,{axis:input.axis,run:input.held('ShiftLeft','ShiftRight'),jump:input.pressed('Space','KeyW','ArrowUp')},dt,state.level==='inside'?-9.2:-16,state.level==='inside'?8.5:24);}
 else {input.pressed('Space','KeyW','ArrowUp');}
 nearby=dialogIndex<0?(state.level==='outside'?(Math.abs(player.body.x-10.2)<1.8?'entrance':''):(Math.abs(player.body.x+8.1)<1.7?'exit':Math.abs(player.body.x-3.2)<1.9?'terminal':'')):'';
 el('interact').hidden=!nearby;
 el('interactText').textContent=nearby==='entrance'?'Enter station':nearby==='exit'?'Return outside':state.heard?'Replay transmission':'Use radio terminal';
 const action=el<HTMLButtonElement>('touchAction');action.disabled=!nearby&&dialogIndex<0;action.textContent=dialogIndex>=0?'NEXT':nearby==='entrance'?'ENTER':nearby==='exit'?'EXIT':'USE';
 player.update(dt);levels.update(dt,player.body.x);camera.update(player.body.x,player.body.facing,dt,state.level==='inside');
 flashlight.visible=state.flashlight;beam.visible=state.flashlight;
 flashlight.position.set(player.body.x+player.body.facing*.45,player.body.y+1.05,.7);flashlight.target.position.set(player.body.x+player.body.facing*8,player.body.y+.7,-1.7);
 beam.position.set(player.body.x+player.body.facing*.45,player.body.y+1.05,-.2);beam.scale.x=player.body.facing;
 time+=dt;levels.terminalLight.intensity=5+Math.sin(time*3)*.4;
 saveTimer+=dt;if(saveTimer>5){persist();saveTimer=0;}
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)el('toast').style.opacity='0';}
}
function frame(now:number){requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.1);last=now;if(document.hidden)return;if(!manualPause){accumulator+=delta;while(accumulator>=1/60){fixed(1/60);accumulator-=1/60;}}renderer.render(scene,camera.camera);}
player.update(0);camera.update(player.body.x,1,1,state.level==='inside');requestAnimationFrame(frame);
setTimeout(()=>toast('The station went silent at 03:14. Find out why.'),900);
