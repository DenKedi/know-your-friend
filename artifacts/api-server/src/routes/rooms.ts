import { Router, type IRouter } from "express";
import {
  CreateRoomBody,
  JoinRoomBody,
  JoinRoomParams,
  GetRoomParams,
} from "@workspace/api-zod";
import { createRoom, joinRoom, getRoom, getRoomStateForClient, type Animal } from "../lib/game-engine";
import type { LanguageCode } from "../lib/languages";

const router: IRouter = Router();

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { hostName, totalRounds, language, animal } = parsed.data as {
    hostName: string;
    totalRounds: number;
    language: LanguageCode;
    animal: Animal;
  };
  if (!hostName.trim()) {
    res.status(400).json({ error: "Host name is required" });
    return;
  }

  const { room, player } = createRoom(hostName.trim(), totalRounds, language, animal);

  res.status(201).json({
    roomCode: room.code,
    playerId: player.id,
    playerToken: player.token,
    roomLanguage: room.language,
  });
});

router.post("/rooms/:roomCode/join", async (req, res): Promise<void> => {
  const params = JoinRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = JoinRoomBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { playerName, animal } = body.data as { playerName: string; animal: Animal };
  if (!playerName.trim()) {
    res.status(400).json({ error: "Player name is required" });
    return;
  }

  const existingRoom = getRoom(params.data.roomCode);
  if (existingRoom?.players.some((player) => player.animal === animal)) {
    res.status(409).json({ error: "Animal has already been selected" });
    return;
  }

  const result = joinRoom(params.data.roomCode, playerName.trim(), animal);
  if (!result) {
    res.status(404).json({ error: "Room not found or game already started" });
    return;
  }

  const { room, player } = result;
  res.status(200).json({
    roomCode: room.code,
    playerId: player.id,
    playerToken: player.token,
    roomLanguage: room.language,
  });
});

router.get("/rooms/:roomCode", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const room = getRoom(params.data.roomCode);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(getRoomStateForClient(room));
});

export default router;
