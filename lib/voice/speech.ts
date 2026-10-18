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
  private activeRecognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
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
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
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
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      onEnd();
      return;
    }

    // Stop any previously active recognition instance to prevent InvalidStateError on desktop
    this.stopListening();

    try {
      // Create fresh SpeechRecognition instance on every session (Chromium best practice)
      const recognition = new SpeechRecognition();
      this.activeRecognition = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
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

      recognition.onerror = (event: any) => {
        const errorType = event.error;
        console.warn('Speech recognition error event:', errorType);

        // 'no-speech' and 'aborted' are normal lifecycle events when user pauses or cancels.
        // DO NOT show an error banner for them!
        if (errorType === 'no-speech' || errorType === 'aborted') {
          return;
        }

        let msg = 'Microphone error occurred.';
        if (errorType === 'not-allowed') {
          msg = 'Microphone permission was denied. Please allow microphone access in your browser settings (click lock icon in address bar).';
        } else if (errorType === 'audio-capture') {
          msg = 'No microphone device was detected. Please connect or enable your microphone.';
        } else if (errorType === 'network') {
          msg = 'Speech recognition network error. Please check your internet connection.';
        }
        onError(msg);
      };

      recognition.onend = () => {
        this.activeRecognition = null;
        onEnd();
      };

      recognition.start();
    } catch (e: any) {
      console.warn('Speech recognition start failed:', e);
      this.activeRecognition = null;
      if (e.name !== 'InvalidStateError') {
        onError('Could not start microphone. Please check permissions.');
      }
      onEnd();
    }
  }

  public stopListening() {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch (e) {
        // ignore
      }
      this.activeRecognition = null;
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
