/**
 * AudioManager.ts
 * 배경 음악 재생 및 음소거 관리
 */

export class AudioManager {
  private audio: HTMLAudioElement;
  private isMuted: boolean = false;

  constructor(musicPath: string) {
    // Audio 객체 생성
    this.audio = new Audio(musicPath);
    this.audio.loop = true; // 반복 재생 설정
    this.audio.volume = 0.5; // 기본 볼륨 50%
    
    // 로컬 스토리지에서 음소거 상태 복원
    const savedMuteState = localStorage.getItem('bgm_muted');
    if (savedMuteState === 'true') {
      this.isMuted = true;
      this.audio.muted = true;
    }
  }

  /**
   * 배경 음악 재생
   */
  play(): void {
    this.audio.play().catch((error) => {
      console.warn('배경 음악 재생 실패:', error);
      // 자동 재생이 차단된 경우, 사용자 인터랙션 후 재시도
    });
  }

  /**
   * 배경 음악 일시정지
   */
  pause(): void {
    this.audio.pause();
  }

  /**
   * 배경 음악 정지 (처음부터 다시)
   */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  /**
   * 음소거 토글
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
    
    // 로컬 스토리지에 상태 저장
    localStorage.setItem('bgm_muted', this.isMuted.toString());
  }

  /**
   * 음소거 상태 확인
   */
  getMuteState(): boolean {
    return this.isMuted;
  }

  /**
   * 볼륨 설정 (0.0 ~ 1.0)
   */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 현재 볼륨 가져오기
   */
  getVolume(): number {
    return this.audio.volume;
  }

  /**
   * Audio 객체 가져오기 (필요한 경우)
   */
  getAudio(): HTMLAudioElement {
    return this.audio;
  }
}
