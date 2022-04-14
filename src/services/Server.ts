import { roomNekos, enemies } from "./mockdata";
import { Client, Room } from "colyseus.js";
import { Schema } from "@colyseus/schema";
import Phaser from "phaser";
import axiosInstance from "../configs/axiosInstance";
import { EMessagePVERoom, TPlanningInfoPVERoom, TEntityEffect } from "./types";

export default class Server {
  private client: Client;
  private room?: Room;
  private events: Phaser.Events.EventEmitter;
  private queue: any[] = [];
  private currIdx: number = 0;
  private roomNekos: any[] = [];
  private roomConsumptions: any[] = [];
  private enemies: any[] = [];

  constructor() {
    this.client = new Client("ws://localhost:4000");
    this.events = new Phaser.Events.EventEmitter();
  }

  async join() {
    const loginResponse = await axiosInstance.post("/v1/login", {
      signature:
        "QkkqwQFXLgPP0zkeVS2ONYdXDkI16ynrG+VdJGipuY1ocE0Ypp9U49AhyJKtnimbnXHglPDlSFuymYA1AX1hBQ==",
      wallet_address: "D5sGL6rCYzWKfZj6eP4SwyV8xQ2PozLY5J76ovnwVw4y",
    });
    const access_token = loginResponse.data.data.access_token;
    const nekos = [
      { id: "2a92913b-98c1-46ff-8427-aa3bfd08d75f" },
      { id: "15c6b4ae-bcd5-4886-bf1e-ec98790e96f3" },
      {
        id: "fa681035-cddc-44be-8182-bd25057c5534",
        skill_ids: [
          "ccf77825-835b-4d90-a81b-96be3919e652",
          "6addb7d1-ec57-407b-b5fb-c3d1c06d5cd6",
        ],
      },
    ];

    const createData = {
      map_level_id: "bd71bc34-8740-4cfc-aa7b-bb90bc44b8a4",
      nekos,
      consumption_item_ids: [
        "5d90ca38-9217-4ead-a8e1-b130610ddb68",
        "cf5aa1e0-57b8-457e-b4e8-4b8859978507",
        "d8eb0196-258b-4d72-a0cf-25188dc39940",
      ],
    };
    const result = await axiosInstance.post(
      "/v1/pve/rooms",
      { ...createData },
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    this.room = await this.client.joinOrCreate("pve_room", {
      roomId: result.data.data.id,
      access_token,
    });

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
            mana: value.metadata.mana,
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
          mana: neko.metadata.mana,
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

    this.room.state.consumptionItems.onAdd = (item, key) => {
      this.roomConsumptions.push({
        id: key,
        name: item.name,
        consumption_item_type_id: item.consumption_item_type_id,
        metadata: {
          background: item.metadata.background,
          damage: item.metadata.damage,
          functionName: item.metadata.functionName,
        },
      });
    };

    this.room.onMessage("*", (type, message) => {
      switch (type) {
        case EMessagePVERoom.Ready:
          console.log("READY");
          this.events.emit("notification", "READY");
          this.events.emit(
            "init-room",
            this.roomNekos,
            this.enemies,
            this.roomConsumptions
          );
          break;
        case EMessagePVERoom.StartRound:
          console.log("START ROUND");

          this.events.emit("notification", `START ROUND ${message.round}`);
          break;
        case EMessagePVERoom.CalculateQueue:
          console.log("GET A QUEUE");
          this.events.emit("notification", "GOT A QUEUE");

          this.queue = message.turns;
          this.currIdx = message.index;
          this.events.emit("queue-changed", this.queue, this.currIdx);
          setTimeout(() => {
            this.sendStartTurn();
            this.events.emit("notification", `START TURN`);

            this.events.emit("start-turn");
          }, 2000);
          break;
        case EMessagePVERoom.Result:
          console.log("RESULTS");
          this.events.emit("notification", "RESULTS");

          this.events.emit("update-results", message.effect);
          break;
        case EMessagePVERoom.EndTurn:
          console.log("END TURN");
          this.events.emit("notification", `END TURN ${message.turn}`);
          break;
        case EMessagePVERoom.EndRound:
          console.log("END ROUND");
          this.events.emit("notification", `END ROUND ${message.round}`);
          this.events.emit("end-round");
          break;
        case EMessagePVERoom.EndGame:
          console.log("END GAME");
          this.events.emit("notification", "END GAME");
          this.events.emit("end-game");
          break;
        case EMessagePVERoom.Error:
          console.log("ERROR CHOOSING ACTION");
          this.events.emit("notification", "ERROR");
          this.events.emit("on-error", message);
        default:
          console.log(type);
          console.log(message);
          break;
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

  initRoom(
    cb: (roomNekos: any[], enemies: any[], consumptionItems: any[]) => void,
    context?: any
  ) {
    this.events.once("init-room", cb, context);
  }
  sendStartRound() {
    console.log("START NEW ROUND");
    this.room?.send(EMessagePVERoom.StartRound);
  }

  onQueueChanged(cb: (queue: any[], currIdx: number) => void, context?: any) {
    this.events.on("queue-changed", cb, context);
  }

  onStartTurn(cb: () => void, context?: any) {
    this.events.on("start-turn", cb, context);
  }

  sendStartTurn() {
    console.log("START TURN");
    if (!this.room) return;
    this.room.send(EMessagePVERoom.StartTurn, this.currIdx);
  }

  sendSkillInformation(skillInfo: TPlanningInfoPVERoom) {
    console.log("skill info", skillInfo);
    if (!this.room) return;
    this.room.send(EMessagePVERoom.Action, skillInfo);
  }

  updateResults(cb: (effect: TEntityEffect) => void, context?: any) {
    this.events.on("update-results", cb, context);
  }

  sendDoneAnimation() {
    if (!this.room) return;
    this.room.send(EMessagePVERoom.DoneAnimation, { x: 1 });
  }
  endRound(cb: () => void, context?: any) {
    this.events.on("end-round", cb, context);
  }
  endGame(cb: () => void, context?:any){
    this.events.on("end-game", cb, context);

  }

  notification(cb: (alert: string) => void, context?: any) {
    this.events.on("notification", cb, context);
  }
  onErrorAction(
    cb: (error: { code: number; message: string }) => void,
    context?: any
  ) {
    this.events.on("on-error", cb, context);
  }
}
