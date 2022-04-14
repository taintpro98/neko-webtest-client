import Phaser from "phaser";

export default class Button {
  private button: Phaser.GameObjects.Text;

  constructor(x, y, label, scene, callback) {
    this.button = scene.add
      .text(x, y, label)
      .setOrigin(0.5)
      .setPadding(10)
      .setStyle({ backgroundColor: "#111" })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => callback())
      .on("pointerover", () => this.button.setStyle({ fill: "#f39c12" }))
      .on("pointerout", () => this.button.setStyle({ fill: "#FFF" }));
  }
  public setVisible(active: boolean) {
    this.button?.setVisible(active);
  }
}
