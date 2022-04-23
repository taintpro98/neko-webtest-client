import {
  STAR_COLOR,
  PROCESSING_QUEUE,
  PROCESSED_QUEUE,
  NOT_PROCESSED_QUEUE,
  AVAILABLE_SKILL_BUTTON_COLOR,
  UNAVAILABLE_SKILL_BUTTON_COLOR,
  AVAILABLE_CONSUMPTION_ITEMS,
  UNAVAILABLE_CONSUMPTION_ITEMS,
  DIED_ENTITY,
  AVAILABLE_SKILL_ENEMY,
} from "./../constants";
import Phaser from "phaser";
import Server from "../services/Server";
import { map } from "../services/mockdata";
import {
  EEntityTypePvERoom,
  TPlanningInfoPVERoom,
  TEntityEffect,
  EActionEntityTypePvERoom,
  ETargetType,
  TActionResponse,
} from "../services/types";
import CountdownController from "./CountdownController";
import {
  CIRCLE_OBJECT_NEKO_COLOR,
  CIRCLE_OBJECT_ENEMY_COLOR,
  BATTLE_FIELD_COLOR,
  TIME_CONFIG,
} from "../constants";
import Button from "./components/Button";

export default class Game extends Phaser.Scene {
  private server?: Server;
  private skillInfo: TPlanningInfoPVERoom = {
    nekoId: "",
    actionType: EActionEntityTypePvERoom.NONE,
    targets: [],
    actionId: "",
  };
  private initialEnemies: Map<string, any> = new Map();
  private initialNekos: Map<string, any> = new Map();
  private aliveEnemies: Map<string, any> = new Map();
  private consumptionItems: Map<string, any> = new Map();
  private currentEntitiesRound: Set<string> = new Set();
  private turnQueues: Map<string, any> = new Map();
  private aliveNekos: Map<string, any> = new Map();
  private actionClock?: CountdownController;
  private notification?: Phaser.GameObjects.Text;
  private characterInfo?: Phaser.GameObjects.Text;
  private guideline?: Phaser.GameObjects.Text;
  private consumptionObject: Map<string, any> = new Map();
  // private queue: Map<string, any> = new Map();
  //   private currentRoundAndTurn?: Phaser.GameObjects.Text;
  private error?: Phaser.GameObjects.Text;
  private nDoneCharacter: number = 0;
  private currCharacter: any;
  private buttonStartRound;
  private turnEffectSkillInfo?: Phaser.GameObjects.Text;
  private numTurnSkillInfo?: Phaser.GameObjects.Text;
  private manaSkillInfo?: Phaser.GameObjects.Text;
  private nameSkillInfo?: Phaser.GameObjects.Text;
  private idSkillInfo?: Phaser.GameObjects.Text;
  private skillInfoActions?: Phaser.GameObjects.Text[];

  constructor() {
    super("game");
  }

  async create(data: { server: Server }) {
    const { server } = data;
    this.server = server;
    if (!this.server) throw new Error("Server instance missing");
    await this.server.join();
    this.buttonStartRound = new Button(750, 30, "Start Round", this, () => {
      this.server?.sendStartRound();
      this.buttonStartRound.setVisible(false);
      this.actionClock?.stop();
    });
    const timerLabel = this.add
      .text(750, 60, "Planning Phase Clock")
      .setOrigin(1);

    this.actionClock = new CountdownController(this, timerLabel);
    this.server.initRoom(this.createMap, this);
  }

  update(time: number, delta: number): void {
    this.actionClock?.update();
  }

  private handleCountdownFinished() {
    this.setGuideline(
      "YOU DIDN'T PLAN ANYTHING ! SO YOUR NEKO AUTOMATICALLY FIGHT"
    );
  }
  private drawInfoSkill = (skill) => {
    const { width, height } = this.scale;
    const x = 12;
    const y = height * 0.4;

    if (!this.nameSkillInfo) {
      this.nameSkillInfo = this.add.text(x, y - 110, `Name: ${skill["name"]}`, {
        fontSize: "14px",
        color: "white",
      });
    } else {
      this.nameSkillInfo.setText(`Name: ${skill["name"]}`);
    }

    if (!this.idSkillInfo) {
      this.idSkillInfo = this.add.text(x, y - 90, `Id: ${skill["id"]}`, {
        fontSize: "14px",
        color: "white",
      });
    } else {
      this.idSkillInfo.setText(`Id: ${skill["id"]}`);
    }

    if (!this.manaSkillInfo) {
      this.manaSkillInfo = this.add.text(
        x,
        y - 70,
        `mana: ${skill["metadata"]["mana"] || 0}`,
        {
          fontSize: "14px",
          color: "white",
        }
      );
    } else {
      this.manaSkillInfo.setText(`mana: ${skill["metadata"]["mana"] || 0}`);
    }
    if (!this.turnEffectSkillInfo) {
      this.turnEffectSkillInfo = this.add.text(
        x,
        y - 50,
        `Turn Effect: ${skill["turn_effect"]}`,
        {
          fontSize: "14px",
          color: "red",
        }
      );
    } else {
      this.turnEffectSkillInfo.setText(`Turn Effect: ${skill["turn_effect"]}`);
    }
    if (!this.numTurnSkillInfo) {
      this.numTurnSkillInfo = this.add.text(
        x,
        y - 35,
        `numTurns: ${skill.metadata["numTurns"] || 0}`,
        {
          fontSize: "14px",
          color: "white",
        }
      );
    } else {
      this.numTurnSkillInfo.setText(`numTurns: ${skill.metadata["numTurns"]}`);
    }
    if (!this.skillInfoActions) {
      this.skillInfoActions = [];
    }
    if (this.skillInfoActions.length) {
      this.skillInfoActions.forEach((item) => {
        item.setText("");
      });
    }
    if (skill.metadata["actions"] && skill.metadata["actions"].length) {
      skill.metadata["actions"].forEach((item, index) => {
        if (this.skillInfoActions && !this.skillInfoActions[index]) {
          this.skillInfoActions.push(
            this.add.text(
              x,
              y - 35 + (index + 1) * 15,
              `action: ${item.action.description} - ${item.action.target}`,
              {
                fontSize: "14px",
                color: "white",
              }
            )
          );
        }
        if (this.skillInfoActions && this.skillInfoActions[index]) {
          this.skillInfoActions[index].setText(
            `action: ${item.action.description} - ${item.target}`
          );
        }
      });
    }
  };

  private createMap(roomNekos: any[], enemies: any[], consumptionItems: any[]) {
    this.add.renderTexture;
    enemies.forEach((e) => {
      this.aliveEnemies.set(e.id, {
        id: e.id,
        name: e.name,
        metadata: e.metadata,
        currentMetadata: e.currentMetadata,
        health_text: null,
        health_text_effect: null,

        atk_text: null,
        atk_text_effect: null,

        m_atk_text: null,
        m_atk_text_effect: null,

        def_text: null,
        def_text_effect: null,

        m_def_text: null,
        m_def_effect_text: null,

        mana_text: null,
        mana_text_effect: null,
        effect_area: null,
        star_object: null,
        circle_object: null,
        queue_object: null,
        skills: [],
        skill_objects: [],
      });
      this.turnQueues.set(e.id, { object: null, text: null });
      this.initialEnemies.set(e.id, { id: e.id, name: e.name });
    });

    roomNekos.forEach((n) => {
      this.aliveNekos.set(n.id, {
        id: n.id,
        name: n.name,
        metadata: n.metadata,
        currentMetadata: n.currentMetadata,

        health_text: null,
        health_text_effect: null,

        atk_text: null,
        atk_text_effect: null,

        m_atk_text: null,
        m_atk_text_effect: null,

        def_text: null,
        def_text_effect: null,

        m_def_text: null,
        m_def_effect_text: null,

        mana_text: null,
        mana_text_effect: null,
        effect_area: null,

        star_object: null,
        circle_object: null,
        queue_object: null,
        skill_objects: [],
        skills: [],
        items: [],
      });
      this.turnQueues.set(n.id, { object: null, text: null });
      this.initialNekos.set(n.id, { id: n.id, name: n.name });
    });

    consumptionItems.forEach((item) => {
      this.consumptionItems.set(item.id, {
        id: item.id,
        name: item.name,
        damage: item.metadata.damage,
        functionName: item.metadata.functionName,
      });
    });

    const { width, height } = this.scale;
    const size = 196;

    let x = width * 0.5 - size;
    let y = height * 0.2 - size;

    map.forEach((cellState, idx) => {
      if (idx > 0 && idx % 3 === 0) {
        y += size + 5;
        x = width * 0.5 - size;
      }
      this.add.rectangle(x, y, size, size, BATTLE_FIELD_COLOR);
      if (idx === 0 || idx === 1 || idx === 2) {
        const ee = this.aliveEnemies.get(enemies[idx].id);
        ee.circle_object = this.add
          .circle(x, y, 85, CIRCLE_OBJECT_ENEMY_COLOR)
          .setInteractive()
          .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
            [...this.aliveEnemies.values()].forEach((ee) => {
              ee.circle_object.disableInteractive();
            });
            ee.star_object.setVisible(true);
            this.skillInfo.targets?.push({
              id: ee.id,
              type: EEntityTypePvERoom.ENEMY,
            });
            const ne = this.aliveNekos.get(this.skillInfo.nekoId);
            ne.skill_objects.forEach((sk) => {
              sk.setAngle(90);
              // sk.disableInteractive();
            });
            this.server?.sendSkillInformation(this.skillInfo);
            this.setNotification("SENDING YOUR ACTION...");
            this.actionClock?.stop();
          });
        ee.star_object = this.add.star(x, y, 4, 8, 60, STAR_COLOR);
        ee.star_object.setVisible(false);
        ee.circle_object.disableInteractive();

        this.add.text(x - 75, y - 50, `Boss ${enemies[idx].name}`, {
          fontSize: "14px",
        });
        ee.health_text = this.add.text(
          x - 75,
          y - 35,
          `Health: ${enemies[idx].metadata["health"]}`,
          { fontSize: "14px" }
        );
        ee.atk_text = this.add.text(
          x - 75,
          y - 20,
          `ATK: ${enemies[idx].currentMetadata["atk"]}`,
          { fontSize: "14px" }
        );
        ee.def_text = this.add.text(
          x - 75,
          y - 5,
          `DEF: ${enemies[idx].currentMetadata["def"]}`,
          { fontSize: "14px" }
        );
        ee.m_atk_text = this.add.text(
          x - 75,
          y + 10,
          `M_ATK: ${enemies[idx].currentMetadata["m_atk"]}`,
          { fontSize: "14px" }
        );
        ee.m_def_text = this.add.text(
          x - 75,
          y + 25,
          `M_DEF: ${enemies[idx].currentMetadata["m_def"]}`,
          { fontSize: "14px" }
        );
        ee.mana_text = this.add.text(
          x - 75,
          y + 40,
          `Mana: ${enemies[idx].metadata["mana"]}`,
          { fontSize: "14px" }
        );
        this.addSkillEnemies(x, y, enemies[idx]);
        this.addEnemyEffect(x, y, enemies[idx]);
      }
      if (idx === 5) {
        this.notification = this.add.text(480, 350, "* NOTIFICATION: ", {
          color: "red",
        });
        this.characterInfo = this.add.text(480, 390, "* CHARACTER: ", {
          color: "red",
        });
        this.guideline = this.add.text(480, 430, "* GUIDELINE: ", {
          color: "red",
        });
      }
      if (idx === 6 || idx === 7 || idx === 8) {
        const ne = this.aliveNekos.get(roomNekos[idx - 6].id);
        ne.circle_object = this.add
          .circle(x, y, 85, CIRCLE_OBJECT_NEKO_COLOR)
          .setInteractive()
          .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
            [...this.aliveNekos.values()].forEach((ee) => {
              ee.circle_object.disableInteractive();
            });
            ne.star_object.setVisible(true);
            this.skillInfo.targets?.push({
              id: ne.id,
              type: EEntityTypePvERoom.NEKO,
            });
            this.server?.sendSkillInformation(this.skillInfo);
            this.setNotification("SENDING YOUR ACTION...");
            this.actionClock?.stop();
          });
        ne.star_object = this.add.star(x, y, 4, 8, 60, STAR_COLOR);
        ne.star_object.setVisible(false);
        this.add.text(x - 75, y - 50, `${roomNekos[idx - 6].name}`, {
          fontSize: "14px",
        });
        ne.health_text = this.add.text(
          x - 75,
          y - 35,
          `Health: ${roomNekos[idx - 6].metadata["health"]}`,
          { fontSize: "14px" }
        );
        ne.atk_text = this.add.text(
          x - 75,
          y - 20,
          `ATK: ${roomNekos[idx - 6].currentMetadata["atk"]}`,
          { fontSize: "14px" }
        );
        ne.def_text = this.add.text(
          x - 75,
          y - 5,
          `DEF: ${roomNekos[idx - 6].currentMetadata["def"]}`,
          { fontSize: "14px" }
        );
        ne.m_atk_text = this.add.text(
          x - 75,
          y + 10,
          `M_ATK: ${roomNekos[idx - 6].currentMetadata["m_atk"]}`,
          { fontSize: "14px" }
        );
        ne.m_def_text = this.add.text(
          x - 75,
          y + 25,
          `M_DEF: ${roomNekos[idx - 6].currentMetadata["m_def"]}`,
          { fontSize: "14px" }
        );
        ne.mana_text = this.add.text(
          x - 70,
          y + 40,
          `Mana: ${roomNekos[idx - 6].metadata["mana"]}`
        );
        this.addSkillsnItems(x, y, roomNekos[idx - 6]);
        this.addNekoEffect(x, y, roomNekos[idx - 6]);
      }
      x += size;
    });
    this.addConsumptionItem();

    this.server?.onQueueChanged(this.addQueue, this);
    this.server?.onStartTurn(this.startTurn, this);
    this.server?.updateResults(this.updateResults, this);
    this.server?.updateEndResults(this.updateEndResult, this);
    this.server?.notification(this.setNotification, this);
    this.server?.onErrorAction(this.setError, this);
    this.server?.endTurn(this.endTurn, this);
    this.server?.endRound(() => {
      this.currentEntitiesRound.clear();
      this.buttonStartRound?.setVisible(true);

      this.actionClock?.start(() => {
        this.buttonStartRound?.setVisible(false);
      }, TIME_CONFIG.WAITING_FOR_START_ROUND);
    });
    this.server?.endGame(() => {
      this.buttonStartRound?.setVisible(false);
      this.actionClock?.stop();
    });
  }

  private setNotification(alert: string) {
    if (alert === "START ROUND") {
      this.nDoneCharacter = 0;

      this.turnQueues.forEach((value, key) => {
        if (!this.aliveEnemies.get(key) && !this.aliveNekos.get(key)) {
          value.object.fillColor = NOT_PROCESSED_QUEUE;
        }
      });
    }
    this.notification?.setText(`* NOTIFICATION: ${alert}`);
  }

  private setGuideline(alert: string) {
    this.guideline?.setText(`* GUIDELINE: ${alert}`);
  }

  private setCharacterInfo(alert: string) {
    this.characterInfo?.setText(`* CHARACTER: ${alert}`);
  }

  private setError(error: { code: number; message: string }) {
    let color = "red";
    switch (error.code) {
      case 4001:
        color = "green";
        break;
      default:
        break;
    }
    this.error = this.add.text(480, 470, `* ERROR: ${error.message}`, {
      color: color,
      fontSize: "15px",
      fontStyle: "Bold",
    });
  }

  private addConsumptionItem() {
    const x = 1200;
    const y = 80;
    let currIdx = 0;
    if (this.consumptionItems.size > 0) {
      this.consumptionItems.forEach((value, key) => {
        let tmp = this.add
          .rectangle(
            x,
            y + (currIdx + 1) * 150,
            200,
            100,
            AVAILABLE_CONSUMPTION_ITEMS
          )
          .setInteractive()
          .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
            tmp.fillColor = UNAVAILABLE_CONSUMPTION_ITEMS;
            this.setCharacterInfo(
              `${value.name} with damage: ${value.damage}, function name: ${value.functionName}`
            );
            this.setGuideline("NOW PICK ONLY ONE ENEMY");
            this.skillInfo.actionType = EActionEntityTypePvERoom.ITEM;
            this.skillInfo.actionId = value.id;
          });
        tmp.setVisible(false);
        // tmp.disableInteractive();
        this.add.text(x - 90, y + (currIdx + 1) * 150 - 20, `${value.name}`);
        this.add.text(
          x - 90,
          y + (currIdx + 1) * 150 - 50,
          `damage:${value.damage}`
        );
        currIdx += 1;
        this.consumptionObject.set(key, tmp);
      });
    }
  }

  private addSkillsnItems(x: number, y: number, neko: any) {
    const ne = this.aliveNekos.get(neko.id);
    neko.skills.forEach((value, idx) => {
      console.log("this: value", value);
      let tmp = this.add
        .rectangle(
          x - 55,
          y + 85 * (idx + 1) + 55,
          50,
          50,
          AVAILABLE_SKILL_BUTTON_COLOR
        )
        .setInteractive()

        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
          this.drawInfoSkill(value);
          if (this.currCharacter.id === neko.id) {
            if (ne.mana < value.metadata["mana"]) {
              this.setGuideline(
                "YOUR NEKO DOESN'T HAVE ENOUGH MANA TO USE THIS SKILL"
              );
            } else {
              ne.skill_objects.forEach((sk) => {
                sk.setAngle(90);
              });
              tmp.setAngle(45);
              this.setCharacterInfo(
                `${value.name} turn_effect: ${value.turn_effect} target: ${value.target}`
              );
              const isAlly =
                value.target === ETargetType.ALLALLIES ||
                value.target === ETargetType.ALLY;
              if (isAlly) {
                [...this.aliveNekos.values()].forEach((ee) => {
                  ee.circle_object.setInteractive();
                });
                [...this.aliveEnemies.values()].forEach((ee) => {
                  ee.circle_object.disableInteractive();
                });
              } else {
                [...this.aliveNekos.values()].forEach((ee) => {
                  ee.circle_object.disableInteractive();
                });
                [...this.aliveEnemies.values()].forEach((ee) => {
                  ee.circle_object.setInteractive();
                });
              }
              this.setGuideline(
                `$NOW PICK ONLY ONE ${
                  value.target === ETargetType.ALLALLIES ||
                  value.target === ETargetType.ALLY
                    ? "NEKO"
                    : "ENEMY"
                }`
              );
              this.skillInfo.target = value.target;
              this.skillInfo.actionType = EActionEntityTypePvERoom.SKILL;

              this.skillInfo.actionId = value.id;
            }
          }
        });
      tmp.setVisible(true);
      // tmp.disableInteractive();
      ne.skill_objects.push(tmp);
      ne.skills.push(value);
      this.add.text(x - 90, y + 75 * (idx + 1) + 55, `${value.name}`);
      this.add.text(
        x - 90,
        y + 75 * (idx + 1) + 75,
        `Mana:${value.metadata["mana"]}`
      );
    });
    // neko.skills.forEach((value, idx) => {
    //     this.add.rectangle(x + 60, y + 85 * (idx + 1) + 55, 80, 80, 0xa020f0).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
    //         this.add.star(x + 60, y + 85 * (idx + 1) + 55, 4, 4, 30, 0xff0000);
    //     });
    //     this.add.text(x + 30, y + 85 * (idx + 1) + 55, `${value.name}`);
    // })
  }
  private addSkillEnemies(x: number, y: number, enemy: any) {
    const ee = this.aliveEnemies.get(enemy.id);
    enemy.skills.forEach((value, idx) => {
      let tmp = this.add
        .rectangle(
          x - 55,
          y - 40 * (idx + 1) - 70,
          70,
          30,
          UNAVAILABLE_CONSUMPTION_ITEMS
        )
        .setInteractive()
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
          this.drawInfoSkill(value);
        });
      tmp.setVisible(true);
      ee.skill_objects.push(tmp);
      ee.skills.push(value);
      this.add.text(x - 90, y - 40 * (idx + 1) - 70, `${value.name}`, {
        fontSize: "12px",
      });
      this.add.text(
        x - 90,
        y - 40 * (idx + 1) - 85,
        `Mana:${value.metadata["mana"]}`,
        { fontSize: "12px" }
      );
    });
  }

  private addNekoEffect(x: number, y: number, neko: any) {
    const ne = this.aliveNekos.get(neko.id);
    ne.effect_area = this.add.rectangle(
      x - 20,
      y + 200,
      150,
      150,
      BATTLE_FIELD_COLOR
    );
    ne.health_text_effect = this.add.text(x + 40, y - 35, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    ne.atk_text_effect = this.add.text(x + 40, y - 20, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    ne.def_text_effect = this.add.text(x + 40, y - 5, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    ne.m_atk_text_effect = this.add.text(x + 40, y + 10, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    ne.m_def_effect_text = this.add.text(x + 40, y + 25, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    ne.mana_text_effect = this.add.text(x + 40, y + 40, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    ne.effect_area.setVisible(false);
    ne.health_text_effect.setVisible(false);
    ne.atk_text_effect.setVisible(false);
    ne.def_text_effect.setVisible(false);
    ne.m_atk_text_effect.setVisible(false);
    ne.m_def_effect_text.setVisible(false);
    ne.mana_text_effect.setVisible(false);
  }

  private addEnemyEffect(x: number, y: number, enemy: any) {
    const e = this.aliveEnemies.get(enemy.id);
    e.effect_area = this.add.rectangle(
      x - 20,
      y - 150,
      150,
      100,
      BATTLE_FIELD_COLOR
    );

    e.health_text_effect = this.add.text(x + 40, y - 35, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    e.atk_text_effect = this.add.text(x + 40, y - 20, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    e.def_text_effect = this.add.text(x + 40, y - 5, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    e.m_atk_text_effect = this.add.text(x + 40, y + 10, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    e.m_def_effect_text = this.add.text(x + 40, y + 25, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    e.mana_text_effect = this.add.text(x + 40, y + 40, "", {
      color: "white",
      fontSize: "12px",
      fontStyle: "bold",
    });
    e.effect_area.setVisible(false);
    e.health_text_effect.setVisible(false);
    e.atk_text_effect.setVisible(false);
    e.def_text_effect.setVisible(false);
    e.m_atk_text_effect.setVisible(false);
    e.m_def_effect_text.setVisible(false);
    e.mana_text_effect.setVisible(false);
  }

  private isShowEnemyEffect(ne: any, visible: boolean, ee?: TEntityEffect) {
    const enemy = this.aliveEnemies.get(ne.id);
    enemy.health_text_effect.setVisible(visible);
    enemy.atk_text_effect.setVisible(visible);
    enemy.def_text_effect.setVisible(visible);
    enemy.m_atk_text_effect.setVisible(visible);
    enemy.m_def_effect_text.setVisible(visible);
    enemy.mana_text_effect.setVisible(visible);
  }

  private isShowNekoEffect(ne: any, visible: boolean, ee?: TEntityEffect) {
    const neko = this.aliveNekos.get(ne.id);
    // neko.effect_area.setVisible(visible);
    ne.health_text_effect.setVisible(visible);
    ne.atk_text_effect.setVisible(visible);
    ne.def_text_effect.setVisible(visible);
    ne.m_atk_text_effect.setVisible(visible);
    ne.m_def_effect_text.setVisible(visible);
    ne.mana_text_effect.setVisible(visible);
  }

  private addQueue(queue: any[], currIdx: number) {
    let x = 300;
    let y = 100;
    // console.log("queue: ", queue);
    // console.log("currIdx: ", currIdx);
    this.currentEntitiesRound.add(queue[currIdx].id);

    this.aliveNekos.forEach((ne) => {
      ne.star_object.setVisible(false);
    });

    this.aliveEnemies.forEach((ee) => {
      ee.star_object.setVisible(false);
    });
    const getCharacter = (action: any) => {
      if (action.type === EEntityTypePvERoom.ENEMY)
        return this.aliveEnemies.get(action.id);
      else return this.aliveNekos.get(action.id);
    };

    const pickColor = (index: number, action: any) => {
      if (
        !this.aliveEnemies.get(action.id) &&
        !this.aliveNekos.get(action.id)
      ) {
        return DIED_ENTITY;
      }
      if (index === currIdx) {
        return PROCESSING_QUEUE;
      } else if (this.currentEntitiesRound.has(action.id)) {
        return PROCESSED_QUEUE;
      } else return NOT_PROCESSED_QUEUE;
    };

    const drawQueue = (action: any, idx: number) => {
      const entityQueue = this.turnQueues.get(action.id);
      if (entityQueue.object) {
        entityQueue.object.setActive(false).setVisible(false);
      }
      entityQueue.object = this.add.rectangle(
        x,
        y + idx * 100,
        80,
        80,
        pickColor(idx, action)
      );
      const name =
        action.type === EEntityTypePvERoom.NEKO
          ? `${
              this.aliveNekos.get(action.id)?.name ||
              `DEAD ${this.initialNekos.get(action.id)?.name}`
            }`
          : `${
              this.aliveEnemies.get(action.id)?.name ||
              `DEAD ${this.initialEnemies.get(action.id)?.name}`
            }`;
      if (entityQueue.text) {
        entityQueue.text.setActive(false).setVisible(false);
      }
      entityQueue.text = this.add.text(x - 35, y + idx * 100, name);
    };

    queue.forEach((action, idx) => {
      drawQueue(action, idx);
      if (action.type === EEntityTypePvERoom.NEKO) {
        if (idx === currIdx) {
          this.currCharacter = this.aliveNekos.get(action.id);
          this.currCharacter.type = EEntityTypePvERoom.NEKO;
          this.skillInfo.nekoId = action.id;
        } else {
          this.aliveNekos.get(action.id)?.skill_objects.forEach((sk) => {
            // sk.disableInteractive();
            // sk.setVisible(false);
            sk.setAngle(90);
          });
        }
      } else {
        if (idx === currIdx)
          this.currCharacter = this.aliveEnemies.get(action.id);
        this.currCharacter.type = EEntityTypePvERoom.ENEMY;
      }
    });
    this.currCharacter.circle_object.fillColor = PROCESSING_QUEUE;

    this.aliveEnemies.forEach((ee, key) => {
      ee.star_object.setVisible(false);
    });
    // this.aliveNekos.forEach((ne, key) => {
    //     ne.object.setVisible(false);
    // })
    this.skillInfo.targets = [];
    this.skillInfo.actionType = EActionEntityTypePvERoom.NONE;
    this.setCharacterInfo(
      `${this.currCharacter.name} with atk: ${
        this.currCharacter.currentMetadata
          ? this.currCharacter.currentMetadata.atk
          : this.currCharacter.atk
      }, def: ${
        this.currCharacter.currentMetadata
          ? this.currCharacter.currentMetadata.def
          : this.currCharacter.def
      }`
    );
  }

  private startTurn() {
    this.buttonStartRound?.setVisible(false);
    if (this.skillInfo.nekoId) {
      this.actionClock?.start(
        this.handleCountdownFinished.bind(this),
        TIME_CONFIG.WAITING_FOR_BATTLE_TIME
      );
      this.setGuideline("CHOOSE A SKILL OR AN ITEM FOR NEKO");
      this.consumptionObject.forEach((value, key) => {
        value.setInteractive();
        value.setVisible(true);
        value.fillColor = AVAILABLE_CONSUMPTION_ITEMS;
      });
      [...this.aliveEnemies.values()].forEach((ee) => {
        ee.circle_object.setInteractive();
      });
      [...this.aliveNekos.values()].forEach((ee) => {
        ee.circle_object.setInteractive();
      });

      this.currCharacter.skill_objects.forEach((sk, idx) => {
        sk.setInteractive();
        sk.setVisible(true);
        sk.setAngle(90);
        if (
          this.currCharacter.mana <
          this.currCharacter.skills[idx].metadata["mana"]
        ) {
          sk.fillColor = UNAVAILABLE_SKILL_BUTTON_COLOR;
        }
      });
    } else {
      this.setGuideline("YOUR ENEMY IS HURTING YOU, WAIT TO STRIKE BACK");
    }
  }

  private async updateResults(action: TActionResponse, effect: any) {
    this.setNotification("RESULTS AND ANIMATION");
    this.actionClock?.stop();
    this.error?.setVisible(false);
    console.log("action: ", action);

    this.consumptionObject.forEach((value, key) => {
      value.setVisible(false);
      value.setInteractive();
    });
    const currentCharQueue = this.turnQueues.get(this.currCharacter.id);
    //NOTE: set choosen action of emeny
    if (this.currCharacter.type === EEntityTypePvERoom.ENEMY) {
      this.currCharacter.skills.forEach((item, index) => {
        if (item.id === action.actionId) {
          this.currCharacter.skill_objects[index].setVisible(true);
          this.currCharacter.skill_objects[index].fillColor =
            AVAILABLE_SKILL_ENEMY;
        }
      });
    }

    this.currCharacter.circle_object.fillColor = this.skillInfo.nekoId
      ? CIRCLE_OBJECT_NEKO_COLOR
      : CIRCLE_OBJECT_ENEMY_COLOR;
    this.nDoneCharacter = (this.nDoneCharacter + 1) % 6;
    this.skillInfo.nekoId = "";
    let diedEnitties: any[] = [];
    await effect.nekos.forEach((ne: TEntityEffect) => {
      const effectNeko = this.aliveNekos.get(ne.id);
      this.isShowNekoEffect(effectNeko, false);
      effectNeko.metadata.health += ne.health || 0;
      // effectNeko.star_object.setVisible(ne.health);

      effectNeko.metadata.def += ne.def || 0;
      effectNeko.metadata.atk += ne.atk || 0;
      effectNeko.metadata.m_def += ne.m_def || 0;
      effectNeko.metadata.m_atk += ne.m_atk || 0;
      effectNeko.metadata.mana += ne.mana ? ne.mana : 0;

      effectNeko.health_text.setText(
        `Health: ${Number(effectNeko.metadata.health).toFixed(2)}`
      );
      effectNeko.mana_text.setText(
        `Mana: ${Number(effectNeko.metadata.mana).toFixed(1)}`
      );
      effectNeko.m_atk_text.setText(
        `M_ATK: ${Number(effectNeko.metadata.m_atk).toFixed(1)}`
      );
      effectNeko.m_atk_text.setText(
        `M_DEF: ${Number(effectNeko.metadata.m_def).toFixed(1)}`
      );
      effectNeko.atk_text.setText(
        `ATK: ${Number(effectNeko.metadata.atk).toFixed(1)}`
      );
      effectNeko.def_text.setText(
        `DEF: ${Number(effectNeko.metadata.def).toFixed(1)}`
      );

      // set text effect
      effectNeko.health_text_effect.setText(`${ne.health || 0}`);
      effectNeko.mana_text_effect.setText(`${ne.mana || 0}`);
      effectNeko.atk_text_effect.setText(`${ne.atk || 0}`);
      effectNeko.m_atk_text_effect.setText(`${ne.m_atk || 0}`);
      effectNeko.def_text_effect.setText(`${ne.def || 0}`);
      effectNeko.m_def_effect_text.setText(`${ne.m_def || 0}`);
      this.isShowNekoEffect(effectNeko, true, ne);
      if (effectNeko.metadata.health <= 0) {
        effectNeko.circle_object.setVisible(false);
        effectNeko.star_object.setVisible(false);
        const diedEntity = this.turnQueues.get(effectNeko.id);
        diedEntity.object.fillColor = DIED_ENTITY;
        diedEntity.text.setText(`DEAD: ${effectNeko.name}`);
        // this.aliveNekos.delete(ne.id);
        diedEnitties.push(effectNeko.id);
      }
    });
    await effect.enemies.forEach((ee: TEntityEffect) => {
      const effectEnemy = this.aliveEnemies.get(ee.id);
      this.isShowEnemyEffect(effectEnemy, false);

      effectEnemy.metadata.health += ee.health || 0;
      effectEnemy.metadata.def += ee.def || 0;
      effectEnemy.metadata.atk += ee.atk || 0;
      effectEnemy.metadata.m_def += ee.m_def || 0;
      effectEnemy.metadata.m_atk += ee.m_atk || 0;
      effectEnemy.metadata.mana += ee.mana ? ee.mana : 0;

      effectEnemy.health_text.setText(
        `Health: ${Number(effectEnemy.metadata.health).toFixed(1)}`
      );
      effectEnemy.mana_text.setText(
        `Mana: ${Number(effectEnemy.metadata.mana).toFixed(1)}`
      );
      effectEnemy.m_atk_text.setText(
        `M_ATK: ${Number(effectEnemy.metadata.m_atk).toFixed(1)}`
      );
      effectEnemy.m_atk_text.setText(
        `M_DEF: ${Number(effectEnemy.metadata.m_def).toFixed(1)}`
      );
      effectEnemy.atk_text.setText(
        `ATK: ${Number(effectEnemy.metadata.atk).toFixed(1)}`
      );
      effectEnemy.def_text.setText(
        `DEF: ${Number(effectEnemy.metadata.def).toFixed(1)}`
      );

      // set text enemy effect
      effectEnemy.health_text_effect.setText(`${ee.health || 0}`);
      effectEnemy.mana_text_effect.setText(`${ee.mana || 0}`);
      effectEnemy.atk_text_effect.setText(`${ee.atk || 0}`);
      effectEnemy.m_atk_text_effect.setText(`${ee.m_atk || 0}`);
      effectEnemy.def_text_effect.setText(`${ee.def || 0}`);
      effectEnemy.m_def_effect_text.setText(`${ee.m_def || 0}`);
      this.isShowEnemyEffect(effectEnemy, true, ee);
      if (effectEnemy.metadata.health <= 0) {
        effectEnemy.circle_object.setVisible(false);
        effectEnemy.star_object.setVisible(false);
        const diedEntity = this.turnQueues.get(effectEnemy.id);
        diedEntity.object.fillColor = DIED_ENTITY;
        diedEntity.text.setText(`DEAD: ${effectEnemy.name}`);
        // this.aliveEnemies.delete(ee.id);
        diedEnitties.push(effectEnemy.id);
      }
    });
    if (!diedEnitties.includes(this.currCharacter.id)) {
      currentCharQueue.object.fillColor = PROCESSED_QUEUE;
    }
    // this.setNotification("MAKING ANIMATION...");
    // setTimeout(() => this.server?.sendDoneAnimation(), 3000);
  }

  private async updateEndResult(effect: any) {
    this.setNotification("END RESULTS AND ANIMATION");
    this.actionClock?.stop();
    this.error?.setVisible(false);

    this.consumptionObject.forEach((value, key) => {
      value.setVisible(false);
      value.setInteractive();
    });
    const currentCharQueue = this.turnQueues.get(this.currCharacter.id);
    // this.currCharacter.circle_object.fillColor = this.skillInfo.nekoId
    //   ? CIRCLE_OBJECT_NEKO_COLOR
    //   : CIRCLE_OBJECT_ENEMY_COLOR;
    this.nDoneCharacter = (this.nDoneCharacter + 1) % 6;
    this.skillInfo.nekoId = "";
    let diedEnitties: any[] = [];
    await effect.nekos.forEach((ne: TEntityEffect) => {
      const effectNeko = this.aliveNekos.get(ne.id);
      this.isShowNekoEffect(effectNeko, false);
      effectNeko.metadata.health += ne.health || 0;
      effectNeko.star_object.setVisible(ne.health);

      effectNeko.currentMetadata.def = effectNeko.metadata.def + (ne.def || 0);
      effectNeko.currentMetadata.atk = effectNeko.metadata.atk + (ne.atk || 0);
      effectNeko.currentMetadata.m_def =
        effectNeko.metadata.m_def + (ne.m_def || 0);
      effectNeko.currentMetadata.m_atk =
        effectNeko.metadata.m_atk + (ne.m_atk || 0);
      effectNeko.metadata.mana += ne.mana ? ne.mana : 0;

      // set text for property
      effectNeko.health_text.setText(
        `Health: ${Number(effectNeko.metadata.health).toFixed(1)}`
      );
      effectNeko.mana_text.setText(
        `Mana: ${Number(effectNeko.metadata.mana).toFixed(1)}`
      );
      effectNeko.m_atk_text.setText(
        `M_ATK: ${Number(effectNeko.currentMetadata.m_atk).toFixed(1)}`
      );
      effectNeko.m_def_text.setText(
        `M_DEF: ${Number(effectNeko.currentMetadata.m_def).toFixed(1)}`
      );
      effectNeko.atk_text.setText(
        `ATK: ${Number(effectNeko.currentMetadata.atk).toFixed(1)}`
      );
      effectNeko.def_text.setText(
        `DEF: ${Number(effectNeko.currentMetadata.def).toFixed(1)}`
      );

      // set text effect
      effectNeko.health_text_effect.setText(`${ne.health || 0}`);
      effectNeko.mana_text_effect.setText(`${ne.mana || 0}`);
      effectNeko.atk_text_effect.setText(`${ne.atk || 0}`);
      effectNeko.m_atk_text_effect.setText(`${ne.m_atk || 0}`);
      effectNeko.def_text_effect.setText(`${ne.def || 0}`);
      effectNeko.m_def_effect_text.setText(`${ne.m_def || 0}`);
      this.isShowNekoEffect(effectNeko, true, ne);

      if (effectNeko.metadata.health <= 0) {
        effectNeko.circle_object.setVisible(false);
        effectNeko.star_object.setVisible(false);
        const diedEntity = this.turnQueues.get(effectNeko.id);
        diedEntity.object.fillColor = DIED_ENTITY;
        diedEntity.text.setText(`DEAD: ${effectNeko.name}`);
        // this.aliveNekos.delete(ne.id);
        diedEnitties.push(effectNeko.id);
      }
    });
    await effect.enemies.forEach((ee: TEntityEffect) => {
      const effectEnemy = this.aliveEnemies.get(ee.id);
      this.isShowEnemyEffect(effectEnemy, false);

      effectEnemy.metadata.health += ee.health || 0;
      effectEnemy.currentMetadata.def =
        effectEnemy.metadata.def + (ee.def || 0);
      effectEnemy.currentMetadata.atk =
        effectEnemy.metadata.atk + (ee.atk || 0);
      effectEnemy.currentMetadata.m_def =
        effectEnemy.metadata.m_def + (ee.m_def || 0);
      effectEnemy.currentMetadata.m_atk =
        effectEnemy.metadata.m_atk + (ee.m_atk || 0);
      effectEnemy.metadata.mana += ee.mana ? ee.mana : 0;

      // set text show enemy property
      effectEnemy.health_text.setText(
        `Health: ${Number(effectEnemy.metadata.health).toFixed(1)}`
      );
      effectEnemy.mana_text.setText(
        `Mana: ${Number(effectEnemy.metadata.mana).toFixed(1)}`
      );
      effectEnemy.m_atk_text.setText(
        `M_ATK: ${Number(effectEnemy.currentMetadata.m_atk).toFixed(1)}`
      );
      effectEnemy.m_atk_text.setText(
        `M_DEF: ${Number(effectEnemy.currentMetadata.m_def).toFixed(1)}`
      );
      effectEnemy.atk_text.setText(
        `ATK: ${Number(effectEnemy.currentMetadata.atk).toFixed(1)}`
      );
      effectEnemy.def_text.setText(
        `DEF: ${Number(effectEnemy.currentMetadata.def).toFixed(1)}`
      );

      // set text effect
      effectEnemy.health_text_effect.setText(`${ee.health || 0}`);
      effectEnemy.mana_text_effect.setText(`${ee.mana || 0}`);
      effectEnemy.atk_text_effect.setText(`${ee.atk || 0}`);
      effectEnemy.m_atk_text_effect.setText(`${ee.m_atk || 0}`);
      effectEnemy.def_text_effect.setText(`${ee.def || 0}`);
      effectEnemy.m_def_effect_text.setText(`${ee.m_def || 0}`);
      this.isShowEnemyEffect(effectEnemy, true, ee);

      if (effectEnemy.metadata.health <= 0) {
        effectEnemy.circle_object.setVisible(false);
        effectEnemy.star_object.setVisible(false);
        const diedEntity = this.turnQueues.get(effectEnemy.id);
        diedEntity.object.fillColor = DIED_ENTITY;
        diedEntity.text.setText(`DEAD: ${effectEnemy.name}`);
        // this.aliveEnemies.delete(ee.id);
        diedEnitties.push(effectEnemy.id);
      }
    });
    if (!diedEnitties.includes(this.currCharacter.id)) {
      currentCharQueue.object.fillColor = PROCESSED_QUEUE;
    }
    this.setNotification("MAKING ANIMATION...");
    setTimeout(() => this.server?.sendDoneAnimation(), 3000);
  }

  private endTurn() {
    // NOTE: set disable skill after each turn
    if (this.currCharacter.type === EEntityTypePvERoom.ENEMY) {
      this.currCharacter.skill_objects.forEach((item) => {
        item.fillColor = UNAVAILABLE_CONSUMPTION_ITEMS;
      });
    }
    this.aliveNekos.forEach((e) => {
      this.isShowNekoEffect(e, false);
      if (e.metadata.mana < 5) {
        e.metadata.mana += 1;
        e.mana_text.setText(`Mana: ${Number(e.metadata.mana).toFixed(1)}`);
      }
    });

    this.aliveEnemies.forEach((e) => {
      this.isShowEnemyEffect(e, false);
      if (e.metadata.mana < 5) {
        e.metadata.mana += 1;
        e.mana_text.setText(`Mana: ${Number(e.metadata.mana).toFixed(1)}`);
      }
    });
  }
}
