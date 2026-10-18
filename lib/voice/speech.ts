export type VoiceGender = 'male' | 'female';
export type VoiceLanguage = 'en' | 'ta';

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  activeGender: VoiceGender;
  language: VoiceLanguage;
  supported: boolean;
  transcript: string;
  error?: string;
}

export class VoiceManager {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }

      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public isSpeechSupported(): boolean {
    return !!this.recognition;
  }

  public isSynthesisSupported(): boolean {
    return !!this.synth;
  }

  public startListening(
    lang: VoiceLanguage,
    onInterim: (text: string) => void,
    onResult: (text: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    this.recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        onResult(final.trim());
      } else if (interim) {
        onInterim(interim.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      let msg = 'Microphone error occurred.';
      if (event.error === 'not-allowed') {
        msg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech detected. Please speak clearly into your mic.';
      }
      onError(msg);
    };

    this.recognition.onend = () => {
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      console.warn('Recognition already started or error:', e);
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  public speak(
    text: string,
    gender: VoiceGender = 'female',
    lang: VoiceLanguage = 'en',
    onStart: () => void,
    onEnd: () => void
  ) {
    if (!this.synth) return;

    this.stopSpeaking();

    // Clean markdown/special characters for speech
    const cleanText = text
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/₹/g, ' Rupees ')
      .replace(/INR/g, ' Rupees ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Pick appropriate voice
    this.loadVoices();
    const targetLangCode = lang === 'ta' ? 'ta' : 'en';

    // Filter by language
    const langVoices = this.voices.filter((v) =>
      v.lang.toLowerCase().startsWith(targetLangCode)
    );

    let chosenVoice: SpeechSynthesisVoice | null = null;

    if (langVoices.length > 0) {
      chosenVoice =
        langVoices.find(
          (v) =>
            v.name.toLowerCase().includes('natural') ||
            v.name.toLowerCase().includes('google') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('sangeeta') ||
            v.name.toLowerCase().includes('priya') ||
            v.name.toLowerCase().includes('samantha')
        ) || langVoices[0];
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onstart = () => {
      onStart();
    };

    utterance.onend = () => {
      onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      onEnd();
    };

    this.synth.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const voiceManager = new VoiceManager();
