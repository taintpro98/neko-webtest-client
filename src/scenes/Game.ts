import { STAR_COLOR, PROCESSING_QUEUE, PROCESSED_QUEUE, NOT_PROCESSED_QUEUE, AVAILABLE_SKILL_BUTTON_COLOR, UNAVAILABLE_SKILL_BUTTON_COLOR } from './../constants';
import Phaser from "phaser";
import Server from "../services/Server";
import { map } from "../services/mockdata";
import { EEntityTypePvERoom, TPlanningInfoPVERoom, TEntityEffect, EActionEntityTypePvERoom } from "../services/types";
import CountdownController from "./CountdownController";
import { CIRCLE_OBJECT_NEKO_COLOR, CIRCLE_OBJECT_ENEMY_COLOR, BATTLE_FIELD_COLOR } from "../constants";

export default class Game extends Phaser.Scene {
    private server?: Server;
    private skillInfo: TPlanningInfoPVERoom = {
        nekoId: '',
        actionType: EActionEntityTypePvERoom.NONE,
        targets: [],
        actionId: '',
    };
    private skillMana: number = 0;
    private aliveEnemies: Map<string, any> = new Map();
    private aliveNekos: Map<string, any> = new Map();
    private actionClock?: CountdownController;
    private notification?: Phaser.GameObjects.Text;
    private characterInfo?: Phaser.GameObjects.Text;
    private guideline?: Phaser.GameObjects.Text;
    private nDoneCharacter: number = 0;
    private currCharacter: any;

    constructor() {
        super('game');
    }

    async create(data: { server: Server }) {
        const { server } = data;
        this.server = server;
        if (!this.server) throw new Error('Server instance missing');
        await this.server.join();
        const timerLabel = this.add.text(750, 60, 'Planning Phase Clock').setOrigin(1);

        this.actionClock = new CountdownController(this, timerLabel);
        this.server.initRoom(this.createMap, this);
    }

    update(time: number, delta: number): void {
        this.actionClock?.update();
    }

    private handleCountdownFinished() {
        this.setGuideline("YOU DIDN'T PLAN ANYTHING ! SO YOUR NEKO AUTOMATICALLY FIGHT");
    }

    private createMap(roomNekos: any[], enemies: any[]) {
        enemies.forEach(e => {
            this.aliveEnemies.set(e.id, {
                id: e.id,
                name: e.name,
                health: e.metadata["health"],
                atk: e.metadata["atk"],
                def: e.metadata["def"],
                mana: e.metadata["mana"],
                health_text: null,
                health_effect_text: null,
                mana_text: null,
                star_object: null,
                circle_object: null,
                queue_object: null
            })
        })
        roomNekos.forEach(n => {
            this.aliveNekos.set(n.id, {
                id: n.id,
                name: n.name,
                health: n.metadata["health"],
                atk: n.metadata["atk"],
                def: n.metadata["def"],
                mana: n.metadata["mana"],
                health_text: null,
                health_effect_text: null,
                mana_text: null,
                star_object: null,
                circle_object: null,
                queue_object: null,
                skill_objects: [],
                skills: [],
                items: []
            })
        })

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
                ee.circle_object = this.add.circle(x, y, 85, CIRCLE_OBJECT_ENEMY_COLOR).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
                    [...this.aliveEnemies.values()].forEach(ee => {
                        ee.circle_object.disableInteractive();
                    })
                    ee.star_object.setVisible(true);
                    this.skillInfo.targets?.push({
                        id: ee.id,
                        type: EEntityTypePvERoom.ENEMY
                    });
                    const ne = this.aliveNekos.get(this.skillInfo.nekoId);
                    if (this.skillInfo.actionType === EActionEntityTypePvERoom.SKILL) {
                        ne.mana -= this.skillMana;
                        ne.mana_text.setText(`Mana: ${ne.mana}`);
                    }
                    ne.skill_objects.forEach(sk => {
                        sk.setAngle(90);
                        sk.disableInteractive();
                    });
                    this.server?.sendSkillInformation(this.skillInfo);
                    this.setNotification("SENDING YOUR ACTION...");
                    this.actionClock?.stop();
                });
                ee.star_object = this.add.star(x, y, 4, 8, 60, STAR_COLOR);
                ee.star_object.setVisible(false);
                ee.circle_object.disableInteractive();

                this.add.text(x - 80, y, `Boss ${enemies[idx].name}`);
                ee.health_text = this.add.text(x - 80, y + 20, `Health: ${enemies[idx].metadata["health"]}`);
                ee.health_effect_text = this.add.text(x - 50, y - 40, "");
            }
            if (idx === 5) {
                this.notification = this.add.text(480, 350, '* NOTIFICATION: ', { color: 'red' });
                this.characterInfo = this.add.text(480, 390, '* CHARACTER: ', { color: 'red' });
                this.guideline = this.add.text(480, 430, '* GUIDELINE: ', { color: 'red' });
            }
            if (idx === 6 || idx === 7 || idx === 8) {
                const ne = this.aliveNekos.get(roomNekos[idx - 6].id);
                ne.circle_object = this.add.circle(x, y, 85, CIRCLE_OBJECT_NEKO_COLOR);
                // .setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
                //     ne.object.setVisible(true);
                //     this.skillInfo.targets?.push({
                //         id: ne.id,
                //         type: EEntityTypePvERoom.NEKO
                //     });
                // });
                ne.star_object = this.add.star(x, y, 4, 8, 60, STAR_COLOR);
                ne.star_object.setVisible(false);
                this.add.text(x - 80, y, `Neko ${roomNekos[idx - 6].name}`);
                ne.health_text = this.add.text(x - 80, y + 20, `Health: ${roomNekos[idx - 6].metadata["health"]}`);
                ne.health_effect_text = this.add.text(x - 50, y - 40, "");
                ne.mana_text = this.add.text(x - 70, y + 40, `Mana: ${roomNekos[idx - 6].metadata["mana"]}`);
                this.addSkillsnItems(x, y, roomNekos[idx - 6]);
            }
            x += size;
        })

        // this.add.rectangle(1300, 150, 100, 100, 0x7b7aa6).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        //     this.server?.startTurn();
        // });
        // this.add.text(1250, 150, 'Start Turn');

        // this.actionButton = this.add.rectangle(1300, 650, 100, 100, 0x7b7aa6).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        //     this.actionButton?.disableInteractive();
        //     const ne = this.aliveNekos.get(this.skillInfo.nekoId);
        //     ne.skills.forEach(sk => {
        //         sk.setAngle(90);
        //         sk.disableInteractive();
        //     });
        //     this.server?.sendSkillInformation(this.skillInfo);
        // });
        // this.add.text(1260, 650, 'Action');

        this.server?.onQueueChanged(this.addQueue, this);
        this.server?.onStartTurn(this.startTurn, this);
        this.server?.updateResults(this.updateResults, this);
        this.server?.notification(this.setNotification, this);
    }

    private setNotification(alert: string) {
        if (alert === "START ROUND") this.nDoneCharacter = 0;
        this.notification?.setText(`* NOTIFICATION: ${alert}`);
    }

    private setGuideline(alert: string) {
        this.guideline?.setText(`* GUIDELINE: ${alert}`);
    }

    private setCharacterInfo(alert: string) {
        this.characterInfo?.setText(`* CHARACTER: ${alert}`);
    }

    private addSkillsnItems(x: number, y: number, neko: any) {
        const ne = this.aliveNekos.get(neko.id);
        neko.skills.forEach((value, idx) => {
            let tmp = this.add.rectangle(x - 55, y + 85 * (idx + 1) + 55, 80, 80, AVAILABLE_SKILL_BUTTON_COLOR).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
                if (ne.mana < value.metadata["mana"]) {
                    this.setGuideline("YOUR NEKO DOESN'T HAVE ENOUGH MANA TO USE THIS SKILL");
                } else {
                    ne.skill_objects.forEach(sk => {
                        sk.setAngle(90);
                    });
                    tmp.setAngle(45);
                    this.setCharacterInfo(`${value.name} with atk: ${value.metadata["atk"]}, def: ${value.metadata["def"]}`);
                    this.setGuideline("NOW PICK ONLY ONE ENEMY");
                    this.skillInfo.actionType = EActionEntityTypePvERoom.SKILL;
                    this.skillInfo.actionId = value.id;
                    this.skillMana = value.metadata["mana"];
                }
            })
            tmp.setVisible(false);
            tmp.disableInteractive();
            ne.skill_objects.push(tmp);
            ne.skills.push(value);
            this.add.text(x - 90, y + 75 * (idx + 1) + 55, `${value.name}`);
            this.add.text(x - 90, y + 75 * (idx + 1) + 75, `Mana:${value.metadata["mana"]}`);
        })
        // neko.skills.forEach((value, idx) => {
        //     this.add.rectangle(x + 60, y + 85 * (idx + 1) + 55, 80, 80, 0xa020f0).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        //         this.add.star(x + 60, y + 85 * (idx + 1) + 55, 4, 4, 30, 0xff0000);
        //     });
        //     this.add.text(x + 30, y + 85 * (idx + 1) + 55, `${value.name}`);
        // })
    }

    private addQueue(queue: any[], currIdx: number) {
        let x = 300;
        let y = 100;

        [...this.aliveNekos.values()].forEach(ne => {
            ne.health_effect_text.setText("");
        });

        [...this.aliveEnemies.values()].forEach(ee => {
            ee.health_effect_text.setText("");
        });

        const pickColor = (index: number) => {
            if (index === currIdx) return PROCESSING_QUEUE;
            else return NOT_PROCESSED_QUEUE;
        }

        const getCharacter = (action: any) => {
            if (action.type === EEntityTypePvERoom.ENEMY) return this.aliveEnemies.get(action.id);
            else return this.aliveNekos.get(action.id);
        }

        const drawQueue = (action: any, idx: number) => {
            let character = getCharacter(action);
            if (character) {
                character.queue_object = this.add.rectangle(x, y + idx * 100, 80, 80, pickColor(idx));
                const name = action.type === EEntityTypePvERoom.NEKO ? `${this.aliveNekos.get(action.id)?.name || "DEAD"}` : `${this.aliveEnemies.get(action.id)?.name || "DEAD"}`;
                this.add.text(x - 35, y + idx * 100, name);
            }
        }

        queue.forEach((action, idx) => {
            if (this.nDoneCharacter === 0) {
                drawQueue(action, idx);
            } else {
                if (idx === currIdx) {
                    drawQueue(action, idx);
                }
            }
            if (action.type === EEntityTypePvERoom.NEKO) {
                if (idx === currIdx) {
                    this.currCharacter = this.aliveNekos.get(action.id);
                    this.skillInfo.nekoId = action.id;
                } else {
                    this.aliveNekos.get(action.id)?.skill_objects.forEach(sk => {
                        sk.disableInteractive();
                        sk.setVisible(false);
                        sk.setAngle(90);
                    });
                }
            } else {
                if (idx === currIdx) this.currCharacter = this.aliveEnemies.get(action.id);
            }
        })
        this.currCharacter.circle_object.fillColor = PROCESSING_QUEUE;

        this.aliveEnemies.forEach((ee, key) => {
            ee.star_object.setVisible(false);
        })
        // this.aliveNekos.forEach((ne, key) => {
        //     ne.object.setVisible(false);
        // })
        this.skillInfo.targets = [];
        this.skillInfo.actionType = EActionEntityTypePvERoom.NONE;
        this.setCharacterInfo(`${this.currCharacter.name} with atk: ${this.currCharacter.atk}, def: ${this.currCharacter.def}`);
    }

    private startTurn() {
        if (this.skillInfo.nekoId) {
            this.actionClock?.start(this.handleCountdownFinished.bind(this), 15000);
            this.setGuideline("CHOOSE A SKILL OR AN ITEM FOR NEKO");
            [...this.aliveEnemies.values()].forEach(ee => {
                ee.circle_object.setInteractive();
            })
            this.currCharacter.skill_objects.forEach((sk, idx) => {
                sk.setInteractive();
                sk.setVisible(true);
                sk.setAngle(90);
                if (this.currCharacter.mana < this.currCharacter.skills[idx].metadata["mana"]) {
                    sk.fillColor = UNAVAILABLE_SKILL_BUTTON_COLOR;
                }
            });
        } else {
            this.setGuideline("YOUR ENEMY IS HURTING YOU, WAIT TO STRIKE BACK");
        }
    }

    private async updateResults(effect: any) {
        this.setNotification("RESULTS AND ANIMATION");
        this.currCharacter.queue_object.fillColor = PROCESSED_QUEUE;
        this.currCharacter.circle_object.fillColor = this.skillInfo.nekoId ? CIRCLE_OBJECT_NEKO_COLOR : CIRCLE_OBJECT_ENEMY_COLOR;
        this.nDoneCharacter = (this.nDoneCharacter + 1) % 6;
        this.skillInfo.nekoId = '';

        await effect.nekos.forEach((ne: TEntityEffect) => {
            const effectNeko = this.aliveNekos.get(ne.id);
            effectNeko.health += ne.health;
            effectNeko.health_effect_text.setText(ne.health ? ne.health : '');

            effectNeko.def += ne.def;
            effectNeko.atk += ne.atk;
            effectNeko.mana += ne.mana ? ne.mana : 0;
            effectNeko.health_text.setText(`Health: ${effectNeko.health}`);
            effectNeko.mana_text.setText(`Mana: ${effectNeko.mana}`);
            if (effectNeko.health <= 0) {
                effectNeko.circle_object.setVisible(false);
                effectNeko.health_text.setText('DEAD');
                this.add.star(effectNeko.queue_object.x, effectNeko.queue_object.y, 4, 8, 60, STAR_COLOR);
                this.aliveNekos.delete(ne.id);
            }
        })
        await effect.enemies.forEach((ee: TEntityEffect) => {
            const effectEnemy = this.aliveEnemies.get(ee.id);
            effectEnemy.health += ee.health;
            effectEnemy.health_effect_text.setText(ee.health ? ee.health : '');

            effectEnemy.def += ee.def;
            effectEnemy.atk += ee.atk;
            effectEnemy.health_text.setText(`Health: ${effectEnemy.health}`);
            if (effectEnemy.health <= 0) {
                effectEnemy.circle_object.setVisible(false);
                effectEnemy.star_object.setVisible(false);
                effectEnemy.health_text.setText('DEAD');
                this.add.star(effectEnemy.queue_object.x, effectEnemy.queue_object.y, 4, 8, 60, STAR_COLOR);
                this.aliveEnemies.delete(ee.id);
            }
        })
        this.setNotification('MAKING ANIMATION...');
        setTimeout(() => this.server?.sendDoneAnimation(), 3000);
    }
}