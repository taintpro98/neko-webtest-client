import Phaser from "phaser";

export default class CountdownController {
  private scene: Phaser.Scene;
  private label: Phaser.GameObjects.Text;
  private timerEvent?: Phaser.Time.TimerEvent;
  private duration: number = 0;
  private finishedCallback?: () => void;

  constructor(scene, label) {
    this.scene = scene;
    this.label = label;
  }

  public start(callback: () => void, duration: number = 10000) {
    this.stop();
    this.finishedCallback = callback;
    this.duration = duration;
    this.timerEvent = this.scene.time.addEvent({
      delay: duration,
      callback: () => {
        this.label.text = "0";
        this.stop();
        if (callback) callback();
      },
    });
  }

  public stop() {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = undefined;
      this.label.text = "0";
    }
  }

  public update() {
    if (!this.timerEvent || this.duration <= 0) return;
    const elapsed = this.timerEvent?.getElapsed();
    const remaining = this.duration - elapsed;
    const seconds = remaining / 1000;
    this.label.text = seconds.toFixed(0);
    if (seconds <= 0) {
    }
  }
}
