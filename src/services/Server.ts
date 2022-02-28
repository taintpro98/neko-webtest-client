import { Client, Room } from 'colyseus.js';
import { Schema } from '@colyseus/schema';
import Phaser from 'phaser';
// import IBattleState, { Skill } from "../../../types/IBattleState";
import { EMessagePVERoom, EEntityTypePvERoom } from './types';

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
            console.log(type);
            switch (type) {
                case EMessagePVERoom.Ready:
                    console.log("READY");
                    this.events.emit('init-room');
                    break;
                case EMessagePVERoom.StartRound:
                    console.log("START ROUND");
                    break;
                case EMessagePVERoom.CalculateQueue:
                    console.log("GET A QUEUE");
                    this.queue = [...message.params.turns];
                    this.currIdx = message.params.index;
                    this.events.emit('queue-changed', this.queue);


                    // this.room?.send(EMessagePVERoom.StartTurn, this.currIdx);

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
                // case EMessagePVERoom.Result:
                //     console.log("RESULTS");
                //     console.log("ANIMATION");
                //     await sleep(5000);
                //     this.send(EMessagePVERoom.DoneAnimation, { x: 1 });
                //     break;
                // case EMessagePVERoom.EndTurn:
                //     console.log("END TURN");
                //     if (clientState.leftNekos > 0) {
                //         this.send(EMessagePVERoom.StartTurn, 1);
                //         await sleep(1000 * randomSecond(15));
                //         this.send(EMessagePVERoom.Action, {
                //             nekoId: "7193102e-f16b-491f-9812-6e777b4956c3",
                //             actionType: 0,
                //             targets: [{
                //                 id: "d511f2d9-a737-4957-ab20-2b81de796622", type: 1
                //             }],
                //             actionId: "303b8ad9-0193-4a3f-b5de-64d23a3db835"
                //         });
                //     };
                //     break;
                // case EMessagePVERoom.EndRound:
                //     console.log("END ROUND");
                //     break;
                default:
                    console.log(type);
                    console.log("default");
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

        this.room.onStateChange((state) => {
            this.events.emit('queue-changed', state.queue);
            this.events.emit('blood-changed', state, this.room?.sessionId);
        });
    }

    initRoom(cb: (map: number[], roomNekos: any, enemies: any) => void, context?: any) {
        this.events.once('init-room', cb, context);
    }

    onQueueChanged(cb: (queue: any[]) => void, context?: any) {
        this.events.on('queue-changed', cb, context);
    }

    // sendSkillInformation(skill_info: { [key: string]: Skill }) {
    //     console.log("skill_info", skill_info);
    //     if (!this.room) return;
    //     this.room.send(Message.PlayerSelection, { skill_info: skill_info });
    // }

    onBoardChanged(cb: (board: number[]) => void, context?: any) {
        this.events.on('board-changed', cb, context);
    }
}