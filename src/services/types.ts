/// enums
export enum EMessagePVERoom {
  Ready = "Ready",
  StartRound = "StartRound",
  CalculateQueue = "CalculateQueue",
  StartTurn = "StartTurn",
  Action = "Action",
  Result = "Result",
  DoneAnimation = "DoneAnimation",
  DoneEndFightAnimation = "DoneEndFightAnimation",
  EndTurn = "EndTurn",
  EndRound = "EndRound",
  EndGame = "EndGame",
  Left = "Left",
  Error = "Error",
  EndResult = "EndResult",
}

export enum EActionEntityTypePvERoom {
  SKILL,
  ITEM,
  NONE,
}

export enum EEntityTypePvERoom {
  NEKO,
  ENEMY,
}

/// types
export type TResponseQueue = {
  index: number;
  turns: { type: EEntityTypePvERoom; id: string }[];
};

export type TPlanningInfoPVERoom = {
  nekoId: string;
  actionType: EActionEntityTypePvERoom;
  targets?: {
    id: string;
    type: EEntityTypePvERoom;
  }[];
  target?: ETargetType;
  actionId?: string;
};

export type TEntityEffect = {
  id: string;
  health?: number;
  atk?: number;
  def?: number;
  mana?: number;
  m_atk?: number;
  m_def?: number;
  speed?: number;
};

export type TActionResponse = {
  actionId: string;
  actionType: EActionEntityTypePvERoom;
};

export enum ETargetType {
  ALLALLIES = "ALLALLIES",
  ALLY = "ALLY",
  ALLENEMIES = "ALLENEMIES",
  ENEMY = "ENEMY",
  SELF = "SELF",
}
