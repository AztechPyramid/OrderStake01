// Tetris Sound Effects using Web Audio API

class TetrisSounds {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.3;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio() {
    try {
      // Modern way with fallback
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('Web Audio API not supported', error);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine') {
    frequencies.forEach(freq => this.playTone(freq, duration, type));
  }

  // Parça hareket sesi - her inmede farklı ton
  playMove(moveCount: number) {
    if (!this.audioContext) return;
    
    // Farklı tonlar için frequency hesapla
    const baseFreq = 220; // A3
    const scale = [1, 1.125, 1.25, 1.33, 1.5, 1.67, 1.875, 2]; // Major scale ratios
    const noteIndex = moveCount % scale.length;
    const frequency = baseFreq * scale[noteIndex];
    
    this.playTone(frequency, 0.1, 'triangle');
  }

  // Parça yerleştirme sesi - başarı tonu
  playPlacement() {
    if (!this.audioContext) return;
    
    // Yükselen chord - başarı hissi
    const frequencies = [330, 415, 523]; // E4, G#4, C5
    this.playChord(frequencies, 0.2, 'sine');
  }

  // Satır temizleme sesi - müthiş his
  playLineClear(linesCleared: number) {
    if (!this.audioContext) return;
    
    if (linesCleared === 1) {
      // Single line - simple success
      const frequencies = [440, 554, 659]; // A4, C#5, E5
      this.playChord(frequencies, 0.3, 'sine');
    } else if (linesCleared === 2) {
      // Double line - better success
      const frequencies = [440, 554, 659, 831]; // A4, C#5, E5, G#5
      this.playChord(frequencies, 0.4, 'sine');
      setTimeout(() => {
        this.playChord([554, 659, 831], 0.3, 'sine');
      }, 100);
    } else if (linesCleared === 3) {
      // Triple line - great success
      this.playTripleSuccess();
    } else if (linesCleared === 4) {
      // Tetris! - amazing success
      this.playTetrisSuccess();
    }
  }

  private playTripleSuccess() {
    if (!this.audioContext) return;
    
    // Ascending triumphant chord progression
    const chord1 = [523, 659, 831]; // C5, E5, G#5
    const chord2 = [587, 740, 932]; // D5, F#5, A#5
    const chord3 = [659, 831, 1047]; // E5, G#5, C6
    
    this.playChord(chord1, 0.2, 'sine');
    setTimeout(() => this.playChord(chord2, 0.2, 'sine'), 100);
    setTimeout(() => this.playChord(chord3, 0.4, 'sine'), 200);
  }

  private playTetrisSuccess() {
    if (!this.audioContext) return;
    
    // Epic Tetris success sound
    const melody = [
      { freq: 659, duration: 0.15 }, // E5
      { freq: 831, duration: 0.15 }, // G#5
      { freq: 1047, duration: 0.15 }, // C6
      { freq: 1319, duration: 0.3 },  // E6
      { freq: 1047, duration: 0.15 }, // C6
      { freq: 1319, duration: 0.5 }   // E6
    ];
    
    melody.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note.freq, note.duration, 'sine');
        // Add harmony
        this.playTone(note.freq * 0.75, note.duration, 'triangle');
      }, index * 120);
    });
  }

  // Oyun başlangıç sesi
  playGameStart() {
    if (!this.audioContext) return;
    
    const startMelody = [
      { freq: 523, duration: 0.2 }, // C5
      { freq: 659, duration: 0.2 }, // E5
      { freq: 784, duration: 0.3 }  // G5
    ];
    
    startMelody.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note.freq, note.duration, 'sine');
      }, index * 150);
    });
  }

  // Oyun bitiş sesi
  playGameOver() {
    if (!this.audioContext) return;
    
    // Descending sad melody
    const gameOverMelody = [
      { freq: 523, duration: 0.3 }, // C5
      { freq: 466, duration: 0.3 }, // A#4
      { freq: 415, duration: 0.3 }, // G#4
      { freq: 370, duration: 0.6 }  // F#4
    ];
    
    gameOverMelody.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note.freq, note.duration, 'sawtooth');
      }, index * 200);
    });
  }

  // Seviye atlama sesi
  playLevelUp() {
    if (!this.audioContext) return;
    
    // Triumphant level up sound
    const levelUpMelody = [
      { freq: 440, duration: 0.15 }, // A4
      { freq: 554, duration: 0.15 }, // C#5
      { freq: 659, duration: 0.15 }, // E5
      { freq: 880, duration: 0.4 }   // A5
    ];
    
    levelUpMelody.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note.freq, note.duration, 'sine');
        // Add echo effect
        setTimeout(() => {
          this.playTone(note.freq, note.duration * 0.5, 'triangle');
        }, 50);
      }, index * 100);
    });
  }

  // Parça döndürme sesi
  playRotate() {
    if (!this.audioContext) return;
    
    // Quick rotation sound
    this.playTone(880, 0.08, 'square');
    setTimeout(() => {
      this.playTone(1047, 0.08, 'square');
    }, 40);
  }

  // Ses seviyesi ayarlama
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioContext!.currentTime);
    }
  }

  // Ses açma/kapama
  toggleMute() {
    if (this.masterGain) {
      const currentVolume = this.masterGain.gain.value;
      this.masterGain.gain.setValueAtTime(
        currentVolume > 0 ? 0 : this.volume,
        this.audioContext!.currentTime
      );
    }
  }
}

// Singleton instance
export const tetrisSounds = new TetrisSounds();