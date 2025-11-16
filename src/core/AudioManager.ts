/**
 * AudioManager.ts
 * 배경 음악 재생 및 음소거 관리
 */

export class AudioManager {
  private audio: HTMLAudioElement;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.6; // 효과음 기본 볼륨

  // 효과음 파일 경로 매핑
  private readonly SFX_PATHS: { [key: string]: string } = {
    // Fire 속성 공격 소리
    fireCast1: "/assets/sound/EM_FIRE_CAST_01.ogg",
    fireCast2: "/assets/sound/EM_FIRE_CAST_02.ogg",
    fireImpact: "/assets/sound/EM_FIRE_IMPACT_01.ogg",
    fireLaunch: "/assets/sound/EM_FIRE_LAUNCH_01.ogg",
    
    // Light 속성 공격 소리
    lightCastLarge: "/assets/sound/EM_LIGHT_CAST_01_L.ogg",
    lightCastSmall: "/assets/sound/EM_LIGHT_CAST_02_S.ogg",
    lightLaunch: "/assets/sound/EM_LIGHT_LAUNCH_01.ogg",
  };

  // VFX 타입과 효과음 매핑
  private readonly VFX_TO_SFX: { [vfxType: string]: string } = {
    // Fire 계열 VFX
    fireHammerRed: "fireCast1",
    fireSlash: "fireCast2",
    fireVortexRed: "fireLaunch",
    fireHurricaneBlue: "fireCast1",
    meteorShowerRed: "fireImpact",
    tornado: "fireCast2",
    
    // Light 계열 VFX
    lightningV1: "lightCastLarge",
    lightningV2: "lightCastSmall",
    skyBeam: "lightLaunch",
  };

  constructor(musicPath: string) {
    // Audio 객체 생성
    this.audio = new Audio(musicPath);
    this.audio.loop = true; // 반복 재생 설정
    this.audio.volume = 0.5; // 기본 볼륨 50%

    // 로컬 스토리지에서 음소거 상태 복원
    const savedMuteState = localStorage.getItem("bgm_muted");
    if (savedMuteState === "true") {
      this.isMuted = true;
      this.audio.muted = true;
    }
  }

  /**
   * 배경 음악 재생
   */
  play(): void {
    this.audio.play().catch((error) => {
      console.warn("배경 음악 재생 실패:", error);
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
    localStorage.setItem("bgm_muted", this.isMuted.toString());
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

  /**
   * VFX 타입에 따른 효과음 재생
   * @param vfxType VFX 타입 (예: "fireHammerRed", "lightningV1")
   */
  playVFXSound(vfxType: string): void {
    if (this.isMuted) return; // 음소거 상태면 재생 안 함

    const sfxKey = this.VFX_TO_SFX[vfxType];
    if (!sfxKey) {
      // 매핑되지 않은 VFX 타입이면 무시
      return;
    }

    const sfxPath = this.SFX_PATHS[sfxKey];
    if (!sfxPath) {
      console.warn(`효과음 경로를 찾을 수 없습니다: ${sfxKey}`);
      return;
    }

    // 새로운 Audio 객체 생성하여 재생 (여러 효과음 동시 재생 가능)
    const sfx = new Audio(sfxPath);
    sfx.volume = this.sfxVolume;
    
    sfx.play().catch((error) => {
      console.warn(`효과음 재생 실패 (${vfxType}):`, error);
    });

    // 재생이 끝나면 자동으로 메모리 정리
    sfx.addEventListener("ended", () => {
      sfx.remove();
    });
  }

  /**
   * 효과음 볼륨 설정 (0.0 ~ 1.0)
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 효과음 볼륨 가져오기
   */
  getSFXVolume(): number {
    return this.sfxVolume;
  }
}
