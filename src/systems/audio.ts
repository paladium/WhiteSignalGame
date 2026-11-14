type Surface = 'snow' | 'floor';
export type Ambience = 'yard' | 'radio' | 'quarters' | 'annex' | 'ridge' | 'crevasse' | 'borehole' | 'coast' | 'hut';

// Each place gets a low drone (two detuned oscillators), a wind level and a slow swell.
const ambiences: Record<Ambience, { drone: number; droneLevel: number; wind: number; swell: number; swellRate: number }> = {
  yard: { drone: 0, droneLevel: 0, wind: .46, swell: 0, swellRate: .1 },
  radio: { drone: 60, droneLevel: .05, wind: .07, swell: 0, swellRate: .1 },
  quarters: { drone: 50, droneLevel: .025, wind: .09, swell: 0, swellRate: .1 },
  annex: { drone: 45, droneLevel: .09, wind: .06, swell: 0, swellRate: .1 },
  ridge: { drone: 0, droneLevel: 0, wind: .62, swell: 0, swellRate: .1 },
  crevasse: { drone: 33, droneLevel: .04, wind: .38, swell: 0, swellRate: .1 },
  borehole: { drone: 38, droneLevel: .1, wind: .03, swell: .08, swellRate: .45 },
  coast: { drone: 0, droneLevel: 0, wind: .4, swell: .26, swellRate: .09 },
  hut: { drone: 55, droneLevel: .04, wind: .12, swell: .07, swellRate: .09 },
};

export class AudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private wind?: GainNode;
  private crunch?: AudioBuffer;
  private snowy = true;
  private place: Ambience = 'yard';
  private drones: OscillatorNode[] = [];
  private droneGain?: GainNode;
  private swell?: GainNode;
  private swellLfo?: OscillatorNode;
  private swellDepth?: GainNode;
  private gustLevel = 0;
  private tuneNoise?: GainNode;
  private tuneVoice?: GainNode;
  private tuneSources: AudioScheduledSourceNode[] = [];
  private tuneLevel = 0;
  volume = .8;
  muted = true;

  private get level() { return this.muted ? 0 : .35 * this.volume; }

  start() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      return;
    }
    if (!window.AudioContext) return;
    let ctx: AudioContext;
    try { ctx = new AudioContext(); } catch { return; }
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.level;
    this.master.connect(ctx.destination);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const wind = buffer.getChannelData(0);
    for (let i = 0; i < wind.length; i++) wind[i] = (Math.random() * 2 - 1) * .34;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 370;
    this.wind = ctx.createGain();
    this.wind.gain.value = this.snowy ? .46 : .07;
    source.connect(filter).connect(this.wind).connect(this.master);
    source.start();

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    this.drones = [0, 1].map(() => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.connect(droneFilter);
      oscillator.start();
      return oscillator;
    });
    droneFilter.connect(this.droneGain).connect(this.master);

    // Surf on the coast and the chamber's slow pulse share one modulated noise layer.
    const surfFilter = ctx.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.value = 650;
    this.swell = ctx.createGain();
    this.swell.gain.value = 0;
    this.swellLfo = ctx.createOscillator();
    this.swellDepth = ctx.createGain();
    this.swellLfo.connect(this.swellDepth).connect(this.swell.gain);
    this.swellLfo.start();
    const surf = ctx.createBufferSource();
    surf.buffer = buffer;
    surf.loop = true;
    surf.playbackRate.value = .7;
    surf.connect(surfFilter).connect(this.swell).connect(this.master);
    surf.start();
    this.ambience(this.place);

    this.crunch = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .23), ctx.sampleRate);
    const grains = this.crunch.getChannelData(0);
    let pressure = 0;
    for (let i = 0; i < grains.length; i++) {
      if (Math.random() < .034) pressure += Math.random() * .48;
      pressure *= .967;
      grains[i] = (Math.random() * 2 - 1) * (.25 + pressure);
    }
  }

  surface(snowy: boolean) {
    this.snowy = snowy;
  }

  ambience(place: Ambience) {
    this.place = place;
    const ctx = this.context;
    if (!ctx || !this.wind || !this.droneGain || !this.swell || !this.swellLfo || !this.swellDepth) return;
    const t = ctx.currentTime;
    const sound = ambiences[place];
    this.gustLevel = 0;
    this.wind.gain.setTargetAtTime(sound.wind, t, .6);
    this.droneGain.gain.setTargetAtTime(sound.droneLevel, t, .8);
    this.drones.forEach((oscillator, i) => {
      if (sound.drone) oscillator.frequency.setTargetAtTime(sound.drone * (i ? 1.007 : 1), t, .3);
    });
    this.swell.gain.setTargetAtTime(sound.swell, t, .8);
    this.swellDepth.gain.setTargetAtTime(sound.swell * .9, t, .8);
    this.swellLfo.frequency.setTargetAtTime(sound.swellRate, t, .3);
  }

  /**
   * Radio tuning feedback: hiss that fades and a wavering voice tone that grows
   * as the dial nears the channel (closeness 0 to 1). Pass null to stop.
   */
  tuning(closeness: number | null) {
    const ctx = this.context;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    if (closeness === null) {
      this.tuneNoise?.gain.setTargetAtTime(0, t, .05);
      this.tuneVoice?.gain.setTargetAtTime(0, t, .05);
      const sources = this.tuneSources;
      setTimeout(() => sources.forEach(source => { try { source.stop(); } catch { /* Already stopped. */ } }), 400);
      this.tuneSources = [];
      this.tuneNoise = this.tuneVoice = undefined;
      this.tuneLevel = 0;
      return;
    }
    if (!this.tuneNoise || !this.tuneVoice) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1900;
      band.Q.value = .6;
      this.tuneNoise = ctx.createGain();
      this.tuneNoise.gain.value = 0;
      noise.connect(band).connect(this.tuneNoise).connect(this.master);

      // A buzzy "voice" whose pitch wavers like speech under a tremolo.
      const voice = ctx.createOscillator();
      voice.type = 'sawtooth';
      voice.frequency.value = 170;
      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.value = 800;
      formant.Q.value = 1.4;
      const wobble = ctx.createOscillator();
      wobble.frequency.value = 3.2;
      const wobbleDepth = ctx.createGain();
      wobbleDepth.gain.value = 22;
      wobble.connect(wobbleDepth).connect(voice.frequency);
      this.tuneVoice = ctx.createGain();
      this.tuneVoice.gain.value = 0;
      voice.connect(formant).connect(this.tuneVoice).connect(this.master);
      for (const source of [noise, voice, wobble]) source.start();
      this.tuneSources = [noise, voice, wobble];
    }
    this.tuneNoise.gain.setTargetAtTime(.03 + .3 * (1 - closeness), t, .04);
    this.tuneVoice.gain.setTargetAtTime(.35 * closeness * closeness, t, .04);
    // A short chime the moment the channel comes in.
    if (closeness >= 1 && this.tuneLevel < 1) this.tone(988, .25, .22);
    this.tuneLevel = closeness;
  }

  /** A low double thump used when a figure has noticed the player. */
  heartbeat(intensity: number) {
    this.tone(52, .16, .16 + intensity * .2);
    setTimeout(() => this.tone(46, .2, .1 + intensity * .16), 170);
  }

  toggle() {
    this.muted = !this.muted;
    this.start();
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.level, this.context.currentTime, .15);
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.level, this.context.currentTime, .1);
  }

  /** Raises the wind during a storm, from 0 (calm) to 1. */
  gust(level: number) {
    if (Math.abs(level - this.gustLevel) < .03 && level !== 0 && level !== 1) return;
    this.gustLevel = level;
    if (this.wind && this.context) {
      this.wind.gain.setTargetAtTime(ambiences[this.place].wind * (1 + level * 1.6), this.context.currentTime, .4);
    }
  }

  step(surface: Surface, force: number, landing = false) {
    const { context: ctx, master, crunch } = this;
    if (!ctx || !master || !crunch || this.muted || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const snow = surface === 'snow';
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    noise.buffer = crunch;
    noise.playbackRate.value = (snow ? .86 : 1.34) + Math.random() * .32;
    filter.type = snow ? 'bandpass' : 'lowpass';
    filter.frequency.value = snow ? 1350 + Math.random() * 480 : 510;
    filter.Q.value = snow ? .60 : .8;
    gain.gain.setValueAtTime(.001, t);
    gain.gain.exponentialRampToValueAtTime((snow ? .65 : .47) * force, t + .012);
    gain.gain.exponentialRampToValueAtTime(.001, t + (snow ? .17 : .075));
    noise.connect(filter).connect(gain).connect(master);
    noise.start(t);
    if (landing || !snow) this.tone(landing ? 70 : 100 + Math.random() * 24, .065, .12 * force);
  }

  beep(frequency = 660) { this.tone(frequency, .18, .24); }

  private tone(frequency: number, length: number, volume: number) {
    if (!this.context || !this.master || this.muted) return;
    const ctx = this.context;
    const t = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + length);
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    oscillator.stop(t + length + .01);
  }

  pause(paused: boolean) {
    if (this.context) void (paused ? this.context.suspend() : this.context.resume()).catch(() => {});
  }
}
