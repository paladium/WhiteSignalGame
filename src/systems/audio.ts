export class AudioSystem {
  context?: AudioContext; master?: GainNode; muted = true; radio?: OscillatorNode;
  start() {
    if (this.context) { void this.context.resume(); return; }
    this.context = new AudioContext(); const ctx = this.context;
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : .18; this.master.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buffer.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*.45;
    const noise=ctx.createBufferSource(); noise.buffer=buffer; noise.loop=true;
    const filter=ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=420;
    noise.connect(filter); filter.connect(this.master); noise.start();
  }
  toggle() { this.muted=!this.muted; this.start(); if(this.master) this.master.gain.setTargetAtTime(this.muted?0:.18,this.context!.currentTime,.2); }
  beep(frequency=660) {
    if (!this.context || !this.master) return;
    const o=this.context.createOscillator(), g=this.context.createGain(), t=this.context.currentTime;
    o.type='sine'; o.frequency.value=frequency; g.gain.setValueAtTime(.3,t); g.gain.exponentialRampToValueAtTime(.001,t+.18);
    o.connect(g); g.connect(this.master); o.start(); o.stop(t+.2);
  }
  pause(paused:boolean) { if(this.context) void (paused?this.context.suspend():this.context.resume()); }
}
