import { EEntityTypePvERoom, TEntityEffect } from "./types";

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomSecond(maxSeconds: number) {
    return Math.floor(Math.random() * maxSeconds) + 1;
}

export function getTargetNekos() {

}

export function getTargetEnemies(aliveEnemies) {
    const tarIdx = randomSecond([aliveEnemies.values()].length - 1);
    const target = [...aliveEnemies.values()][tarIdx];
    return [{
        id: target.id,
        type: EEntityTypePvERoom.ENEMY
    }]
}

export function handleEffect(effect: TEntityEffect){

}