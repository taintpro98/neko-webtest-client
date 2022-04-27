import { roomNekos, enemies } from "./mockdata";
import { Client, Room } from "colyseus.js";
import { Schema } from "@colyseus/schema";
import Phaser from "phaser";
import axiosInstance from "../configs/axiosInstance";
import {
  EMessagePVERoom,
  TPlanningInfoPVERoom,
  TEntityEffect,
  TActionResponse,
} from "./types";

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
    this.client = new Client("ws://13.212.107.173:4000");
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
      {
        id: "2a92913b-98c1-46ff-8427-aa3bfd08d75f",
        skill_ids: [
          "2621af68-5674-4136-ab5c-a8e4a4f01f6b",
          "fb13956f-40af-48cb-bf1f-9c7238e25b46",
          "c991124f-b4b3-44e9-8bef-03b5fadce885",
          "5552306c-78b4-4c45-bed1-886d8aaa32c0",
          "3890a002-948d-43e1-a0dd-22428c85c3b3",
          "60ecad94-65c2-4eaf-bcdd-850b81e6c1b4",
        ],
      },
      {
        id: "15c6b4ae-bcd5-4886-bf1e-ec98790e96f3",
        skill_ids: [
          "82398099-6fb4-48a7-a1a4-8fee7030ae59",
          "21d73e4a-13aa-4894-b6d5-90dced76481f",
          "7e4bd07d-cc65-4493-89c8-e61b6f1161f0",
          "15449e11-0e3e-4e25-bbc4-55abff048f0e",
          "cec12728-c231-43a0-a6be-a936d40bdab3",
        ],
      },
      {
        id: "fa681035-cddc-44be-8182-bd25057c5534",
        skill_ids: [
          "6c055f33-6137-43e1-b0f8-1984cce3ea33",
          "90f42c09-f1bf-467e-aa32-49c191a9da6b",
          "ccf77825-835b-4d90-a81b-96be3919e652",
          "2ed6c66a-f12e-4d5b-8e34-8cc5fa5610bb",
          "b0b5e866-9a6c-4f3d-be47-c4f3e5001982",
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
    const pveRoomStateData = await axiosInstance.get(
      `/v1/pve/rooms/${result.data.data.id}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const roomState = pveRoomStateData.data.data;
    console.log(roomState);
    roomState.nekos.forEach((item) => {
      let skills: any[] = [];
      if (item.skills.length !== 0) {
        skills = item.skills.map((item) => ({
          id: item.id,
          name: item.name,
          turn_effect: item.turn_effect,
          target: item.target,
          description_skill_card: item.description_skill_card,
          code: item.code,
          metadata: {
            numTurns: item.metadata.numTurns,
            mana: item.metadata.mana,
            actions: item.metadata.actions,
          },
        }));
      }
      this.roomNekos.push({
        id: item.id,
        name: item.name,
        skills: skills,
        metadata: item.metadata,
        currentMetadata: item.metadata,
      });
    });

    roomState.enemies.forEach((item) => {
      let skills: any[] = [];
      if (item.skills.length !== 0) {
        skills = item.skills.map((item) => ({
          id: item.id,
          name: item.name,
          turn_effect: item.turn_effect,
          target: item.target,
          description_skill_card: item.description_skill_card,
          code: item.code,
          metadata: {
            numTurns: item.metadata.numTurns,
            mana: item.metadata.mana,
            actions: item.metadata.actions,
          },
        }));
      }
      this.enemies.push({
        id: item.id,
        name: item.name,
        skills: skills,
        metadata: item.metadata,
        currentMetadata: item.metadata,
      });
    });

    roomState.consumption_items.forEach((item, index) => {
      this.roomConsumptions.push({
        id: item.id,
        name: item.name,
        consumption_item_type_id: item.consumption_item_type_id,
        metadata: {
          background: item.metadata.background,
          damage: item.metadata.damage,
          functionName: item.metadata.functionName,
        },
      });
    });

    this.room = await this.client.joinOrCreate("pve_room", {
      roomId: result.data.data.id,
      access_token,
    });

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

          this.events.emit("update-results", message.action, message.effect);
          break;
        case EMessagePVERoom.EndResult:
          console.log("END RESULTS");
          this.events.emit("notification", "END RESULTS");
          this.events.emit("update-endresults", message.effect);
          break;
        case EMessagePVERoom.EndTurn:
          console.log("END TURN");
          this.events.emit("notification", `END TURN ${message.turn}`);
          this.events.emit("end-turn");
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

  updateResults(
    cb: (action: TActionResponse, effect: TEntityEffect) => void,
    context?: any
  ) {
    this.events.on("update-results", cb, context);
  }

  updateEndResults(cb: (effect: TEntityEffect) => void, context?: any) {
    this.events.on("update-endresults", cb, context);
  }

  sendDoneAnimation() {
    if (!this.room) return;
    this.room.send(EMessagePVERoom.DoneAnimation, { x: 1 });
  }

  sendDoneEndAnimation() {
    if (!this.room) return;
    this.room.send(EMessagePVERoom.DoneEndFightAnimation);
  }


  endTurn(cb: () => void, context?: any) {
    this.events.on("end-turn", cb, context);
  }
  endRound(cb: () => void, context?: any) {
    this.events.on("end-round", cb, context);
  }
  endGame(cb: () => void, context?: any) {
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
