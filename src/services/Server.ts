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
        id: "cbc2a246-bfe7-4258-950b-86b5b5bd741e",
        skill_ids: [
          "3a7c342f-fbae-49f3-9603-a1d3edc6c4f4",
          "dcd32a49-a6ff-431b-94c9-cbed6ef5224c",
        ],
      },
      {
        id: "c9ae3611-c824-4c27-9f73-9a3dd5e8f186",
        skill_ids: [
          "0d7caf9f-25d6-4ef4-902e-1caa64a8729b",
          "76673a7f-65f5-4eec-85d9-9582aafbe3cf",
          "de923add-9dd6-4436-b0d4-bdec6a1f148b",
        ],
      },
      {
        id: "8e402e7e-805f-4ecc-887b-3d040f3e7938",
        skill_ids: [
          "c2ea14ec-b521-47ad-ac06-cad1bd49677e",
          "1003c8d2-44ba-4137-9f80-4685c961e569",
          "50f5297b-c9be-421a-bb0c-f16ab470e23f",
        ],
      },
    ];

    const createData = {
      map_level_id: "bd71bc34-8740-4cfc-aa7b-bb90bc44b8a4",
      nekos,
      consumption_item_ids: ["ca5916ca-1a14-4bef-8bbf-fa714b592efc", "963f3831-6be8-4331-b0f1-56857a5d9206", "90a45c94-ab4c-4d97-ae66-c954628b84f8"],
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
        quantity: item.quantity,
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
          console.log("update-results", message)

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
