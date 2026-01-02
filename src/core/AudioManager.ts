/**
 * AudioManager.ts
 * 배경 음악 재생 및 음소거 관리
 */

export class AudioManager {
  private audio: HTMLAudioElement;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.6; // 효과음 기본 볼륨

  // 효과음 오디오 풀 (미리 로드하여 재사용)
  private sfxPool: Map<string, HTMLAudioElement[]> = new Map();
  private readonly POOL_SIZE = 3; // 동일 효과음 최대 3개 동시 재생

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

    // 효과음 오디오 풀 초기화 (미리 로드)
    this.initializeSFXPool();
  }

  /**
   * 효과음 오디오 풀 초기화
   */
  private initializeSFXPool(): void {
    for (const [key, path] of Object.entries(this.SFX_PATHS)) {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < this.POOL_SIZE; i++) {
        const audio = new Audio(path);
        audio.volume = this.sfxVolume;
        audio.preload = "auto";
        pool.push(audio);
      }
      this.sfxPool.set(key, pool);
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

    const pool = this.sfxPool.get(sfxKey);
    if (!pool || pool.length === 0) {
      console.warn(`효과음 풀을 찾을 수 없습니다: ${sfxKey}`);
      return;
    }

    // 재생 가능한 오디오 찾기 (재생 중이 아닌 것)
    let availableAudio = pool.find((audio) => audio.paused || audio.ended);

    // 모두 재생 중이면 첫 번째 것을 재사용
    if (!availableAudio) {
      availableAudio = pool[0];
      availableAudio.currentTime = 0; // 처음부터 재생
    }

    availableAudio.volume = this.sfxVolume;
    availableAudio.play().catch(() => {
      // 재생 실패는 조용히 무시 (성능 최우선)
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
