import { Client, Room } from 'colyseus.js';
import { Schema } from '@colyseus/schema';
import Phaser from 'phaser';
import { EMessagePVERoom, EEntityTypePvERoom, TPlanningInfoPVERoom, TEntityEffect } from './types';

export default class Server {
    private client: Client;
    private room?: Room;
    private events: Phaser.Events.EventEmitter;
    private queue: any[] = [];
    private currIdx: number = 0;

    constructor() {
        this.client = new Client('ws://localhost:4000');
        this.events = new Phaser.Events.EventEmitter;
    }

    async join() {
        this.room = await this.client.joinOrCreate('pve_room', {
            playerId: 1
        });

        this.room.onMessage("*", (type, message) => {
            switch (type) {
                case EMessagePVERoom.Ready:
                    console.log("READY");
                    this.events.emit('notification', 'READY');
                    this.events.emit('init-room');
                    break;
                case EMessagePVERoom.StartRound:
                    console.log("START ROUND");
                    this.events.emit('notification', 'START ROUND');
                    break;
                case EMessagePVERoom.CalculateQueue:
                    console.log("GET A QUEUE");
                    this.events.emit('notification', 'GET A QUEUE');
                    this.queue = [...message.params.turns];
                    this.currIdx = message.params.index;
                    this.events.emit('queue-changed', this.queue, message.params.index);

                    // let character = this.queue[this.currIdx];

                    // if (character.type === EEntityTypePvERoom.NEKO) {
                    //     const neko = roomNekos.filter(n => n.id === character.id)[0];
                    //     const targets = getTargetEnemies(aliveEnemies);
                    //     const skillInfo: TPlanningInfoPVERoom = {
                    //         nekoId: character.id,
                    //         actionType: 0,
                    //         targets: targets,
                    //         actionId: neko.skills[0].id
                    //     };
                    //     this.send(EMessagePVERoom.Action, skillInfo);
                    // }
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
        //     console.log("xxxxxxxxxx", changes);
        //     changes.forEach(change => {
        //         const { field, value } = change;
        //         switch(field){
        //             case 'queue':
        //                 this.events.emit('queue-changed', value);
        //                 break;
        //             case 'bosses':
        //                 break;
        //         }
        //     })
        // }

        // this.room.onStateChange((state) => {
        //     this.events.emit('queue-changed', state.queue);
        //     this.events.emit('blood-changed', state, this.room?.sessionId);
        // });
    }

    initRoom(cb: () => void, context?: any) {
        this.events.once('init-room', cb, context);
    }

    onQueueChanged(cb: (queue: any[], currIdx: number) => void, context?: any) {
        this.events.on('queue-changed', cb, context);
    }

    startTurn() {
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