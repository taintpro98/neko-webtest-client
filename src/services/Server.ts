import { roomNekos, enemies } from './mockdata';
import { Client, Room } from 'colyseus.js';
import { Schema } from '@colyseus/schema';
import Phaser from 'phaser';
import { EMessagePVERoom, TPlanningInfoPVERoom, TEntityEffect } from './types';

export default class Server {
    private client: Client;
    private room?: Room;
    private events: Phaser.Events.EventEmitter;
    private queue: any[] = [];
    private currIdx: number = 0;
    private roomNekos: any[] = [];
    private enemies: any[] = [];

    constructor() {
        this.client = new Client('ws://localhost:4000');
        this.events = new Phaser.Events.EventEmitter;
    }

    async join() {
        this.room = await this.client.joinOrCreate('pve_room', {});

        // update enemy, neko and consumption_items follow server
        this.room.state.nekos.onAdd = (neko, key) => {
            let skills: any[] = [];
            neko.skills.forEach((value, key) => {
                skills.push({
                    id: value.id,
                    name: value.name,
                    metadata: {
                        function: value.metadata.function,
                        atk: value.metadata.atk,
                        speed: value.metadata.speed,
                        def: value.metadata.def,
                        mana: value.metadata.mana
                    },
                });
            });
            this.roomNekos.push({
                id: neko.id,
                name: neko.name,
                skills: skills,
                metadata: {
                    atk: neko.metadata.atk,
                    def: neko.metadata.def,
                    health: neko.metadata.health,
                    speed: neko.metadata.speed,
                    mana: neko.metadata.mana
                },
            });
        };

        this.room.state.enemies.onAdd = (enemy, key) => {
            let skills: any[] = [];
            enemy.skills.forEach((value, key) => {
                skills.push({
                    id: value.id,
                    name: value.name,
                    metadata: {
                        function: value.metadata.function,
                        atk: value.metadata.atk,
                        speed: value.metadata.speed,
                        def: value.metadata.def,
                    },
                });
            });

            this.enemies.push({
                id: enemy.id,
                name: enemy.name,
                skills: skills,
                strategy: enemy.strategy,
                metadata: {
                    atk: enemy.metadata.atk,
                    def: enemy.metadata.def,
                    speed: enemy.metadata.speed,
                    health: enemy.metadata.health,
                },
            });
        };

        this.room.onMessage("*", (type, message) => {
            switch (type) {
                case EMessagePVERoom.Ready:
                    console.log("READY");
                    this.events.emit('notification', 'READY');
                    this.events.emit('init-room', this.roomNekos, this.enemies);
                    break;
                case EMessagePVERoom.StartRound:
                    console.log("START ROUND");
                    this.events.emit('notification', 'START ROUND');
                    break;
                case EMessagePVERoom.CalculateQueue:
                    console.log("GET A QUEUE");
                    this.events.emit('notification', 'GET A QUEUE');
                    this.queue = [...message.params.turns].reverse();
                    this.currIdx = 5 - message.params.index;
                    setTimeout(() => {
                        this.startTurn();
                        this.events.emit('queue-changed', this.queue, this.currIdx);
                    }, 2000);
                    break;
                case EMessagePVERoom.Result:
                    console.log("RESULTS");
                    this.events.emit('notification', 'RESULTS AND ANIMATION');
                    this.events.emit('update-results', message.params.effect);
                    break;
                case EMessagePVERoom.EndTurn:
                    console.log("END TURN");
                    this.events.emit('notification', 'END TURN');
                    break;
                case EMessagePVERoom.EndRound:
                    console.log("END ROUND");
                    this.events.emit('notification', 'END ROUND');
                    break;
                case EMessagePVERoom.EndGame:
                    console.log("END GAME");
                    this.events.emit('notification', 'END GAME');
                    break;
                default:
                    console.log(type);
            }
        });

        // this.room.state.onChange = (changes) => {
        //     changes.forEach(change => {
        //         const { field, value } = change;
        //         switch(field){
        //             case 'nekos':
        //                 console.log("value", [...value.values()]);
        //                 this.roomNekos = [...value.values()]
        //                 break;
        //             case 'enemies':
        //                 console.log("enemies");
        //                 this.enemies = [...value.values()];
        //                 break;
        //         }
        //     })
        // }

        // this.room.onStateChange((state) => {
        //     this.events.emit('queue-changed', state.queue);
        //     this.events.emit('blood-changed', state, this.room?.sessionId);
        // });
    }

    initRoom(cb: (roomNekos: any[], enemies: any[]) => void, context?: any) {
        this.events.once('init-room', cb, context);
    }

    onQueueChanged(cb: (queue: any[], currIdx: number) => void, context?: any) {
        this.events.on('queue-changed', cb, context);
    }

    startTurn() {
        console.log("START TURN");
        this.events.emit("notification", "START TURN");
        if (!this.room) return;
        this.room.send(EMessagePVERoom.StartTurn, this.currIdx);
    }

    sendSkillInformation(skillInfo: TPlanningInfoPVERoom) {
        console.log("skill info", skillInfo);
        if (!this.room) return;
        this.room.send(EMessagePVERoom.Action, skillInfo);
    }

    updateResults(cb: (effect: TEntityEffect) => void, context?: any) {
        this.events.on('update-results', cb, context);
    }

    sendDoneAnimation() {
        if (!this.room) return;
        this.room.send(EMessagePVERoom.DoneAnimation, { x: 1 });
    }

    notification(cb: (alert: string) => void, context?: any) {
        this.events.on('notification', cb, context);
    }
}