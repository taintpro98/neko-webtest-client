import Phaser from "phaser";
import Server from "../services/Server";
import { map } from "../services/mockdata";
import { EEntityTypePvERoom, TPlanningInfoPVERoom, TEntityEffect, EActionEntityTypePvERoom } from "../services/types";
import CountdownController from "./CountdownController";

export default class Game extends Phaser.Scene {
    private server?: Server;
    private skillInfo: TPlanningInfoPVERoom = {
        nekoId: '',
        actionType: EActionEntityTypePvERoom.NONE,
        targets: [],
        actionId: ''
    };
    private aliveEnemies: Map<string, any> = new Map();
    private aliveNekos: Map<string, any> = new Map();
    private actionClock?: CountdownController;
    private actionButton?: Phaser.GameObjects.Rectangle;
    private notification?: Phaser.GameObjects.Text;

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
        this.server?.sendSkillInformation(this.skillInfo);
        this.notification?.setText("YOU DID NOT PLAN ANYTHING ! SO YOUR NEKO AUTOMATICALLY FIGHT");
    }

    private createMap(roomNekos: any[], enemies: any[]) {
        enemies.forEach(e => {
            this.aliveEnemies.set(e.id, {
                id: e.id,
                name: e.name,
                health: e.metadata["health"],
                atk: e.metadata["atk"],
                def: e.metadata["def"],
                text: null,
                object: null
            })
        })
        roomNekos.forEach(n => {
            this.aliveNekos.set(n.id, {
                id: n.id,
                name: n.name,
                health: n.metadata["health"],
                atk: n.metadata["atk"],
                def: n.metadata["def"],
                text: null,
                object: null,
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
            this.add.rectangle(x, y, size, size, 0xffffff);
            if (idx === 0 || idx === 1 || idx === 2) {
                const ee = this.aliveEnemies.get(enemies[idx].id);

                this.add.circle(x, y, 85, 0x0000ff).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
                    ee.object.setVisible(true);
                    this.skillInfo.targets?.push({
                        id: ee.id,
                        type: EEntityTypePvERoom.ENEMY
                    });
                    const ne = this.aliveNekos.get(this.skillInfo.nekoId);
                    ne.skills.forEach(sk => {
                        sk.setAngle(90);
                        sk.disableInteractive();
                    });
                    this.server?.sendSkillInformation(this.skillInfo);
                    this.notification?.setText("SENT YOUR ACTION");
                });;
                ee.object = this.add.star(x, y, 4, 8, 60, 0xff0000);
                ee.object.setVisible(false);

                this.add.text(x - 80, y, `Boss ${enemies[idx].name}`);
                ee.text = this.add.text(x - 80, y + 20, `Health: ${enemies[idx].metadata["health"]}`);
            }
            if (idx === 5) {
                this.notification = this.add.text(480, 350, '', { color: 'red' });
            }
            if (idx === 6 || idx === 7 || idx === 8) {
                const ne = this.aliveNekos.get(roomNekos[idx - 6].id);
                this.add.circle(x, y, 85, 0xFFC0CB).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
                    ne.object.setVisible(true);
                    this.skillInfo.targets?.push({
                        id: ne.id,
                        type: EEntityTypePvERoom.NEKO
                    });
                });
                ne.object = this.add.star(x, y, 4, 8, 60, 0xff0000);
                ne.object.setVisible(false);

                this.add.text(x - 80, y, `Neko ${roomNekos[idx - 6].name}`);
                this.aliveNekos.get(roomNekos[idx - 6].id).text = this.add.text(x - 80, y + 20, `Health: ${roomNekos[idx - 6].metadata["health"]}`)
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
        this.server?.updateResults(this.updateResults, this);
        this.server?.notification(this.setNotification, this);
    }

    private setNotification(alert: string) {
        this.notification?.setText(alert);
    }

    private addSkillsnItems(x: number, y: number, neko: any) {
        const ne = this.aliveNekos.get(neko.id);
        neko.skills.forEach((value, idx) => {
            let tmp = this.add.rectangle(x - 60, y + 85 * (idx + 1) + 55, 80, 80, 0x9d8e00).setInteractive().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
                tmp.setAngle(45);
                this.skillInfo.actionType = EActionEntityTypePvERoom.SKILL;
                this.skillInfo.actionId = value.id;
            })
            tmp.setVisible(false);
            tmp.disableInteractive();
            ne.skills.push(tmp);
            this.add.text(x - 90, y + 85 * (idx + 1) + 55, `${value.name}`);
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

        queue.forEach((action, idx) => {
            this.add.rectangle(x, y + idx * 100, 80, 80, idx === currIdx ? 0xc97aa6 : 0x49643d);
            const name = action.type === EEntityTypePvERoom.NEKO ? `${this.aliveNekos.get(action.id)?.name || "Dead"}` : `${this.aliveEnemies.get(action.id)?.name || "Dead"}`;
            this.add.text(x - 35, y + idx * 100, name);

            if (action.type === EEntityTypePvERoom.NEKO) {
                let chosenOne = this.aliveNekos.get(action.id);
                if (idx === currIdx) {
                    this.actionClock?.start(this.handleCountdownFinished.bind(this), 15000);
                    // this.actionButton?.setInteractive();
                    this.notification?.setText("CHOOSE A PLAN FOR YOUR NEKO AND PICK ONLY ONE ENEMY AS YOUR TARGET");
                    this.skillInfo.nekoId = action.id;
                    chosenOne.skills.forEach(sk => {
                        sk.setInteractive();
                        sk.setVisible(true);
                        sk.setAngle(90);
                    });
                } else {
                    chosenOne.skills.forEach(sk => {
                        sk.disableInteractive();
                        sk.setVisible(false);
                        sk.setAngle(90);
                    });
                }
            }
        })

        this.aliveEnemies.forEach((ee, key) => {
            ee.object.setVisible(false);
        })
        this.aliveNekos.forEach((ne, key) => {
            ne.object.setVisible(false);
        })
        this.skillInfo.targets = [];
    }

    private async updateResults(effect: any) {
        await effect.nekos.forEach((ne: TEntityEffect) => {
            const effectNeko = this.aliveNekos.get(ne.id);
            effectNeko.health += ne.health;
            effectNeko.def += ne.def;
            effectNeko.atk += ne.atk;
            effectNeko.text.setText(`Health: ${effectNeko.health}`);
            if (effectNeko.health <= 0) {
                effectNeko.object.setVisible(true);
                effectNeko.text.setText('This Neko was dead');
                this.aliveNekos.delete(ne.id);
            }
        })
        await effect.enemies.forEach((ee: TEntityEffect) => {
            const effectEnemy = this.aliveEnemies.get(ee.id);
            effectEnemy.health += ee.health;
            effectEnemy.def += ee.def;
            effectEnemy.atk += ee.atk;
            effectEnemy.text.setText(`Health: ${effectEnemy.health}`);
            if (effectEnemy.health <= 0) {
                effectEnemy.object.setVisible(true);
                effectEnemy.text.setText('This Enemy was dead');
                this.aliveEnemies.delete(ee.id);
            }
        })
        this.notification?.setText('Making Animation');
        setTimeout(() => this.server?.sendDoneAnimation(), 3000);
    }
}