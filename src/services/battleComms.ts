import { BATTLE_CHAT_MAX_LENGTH } from '../config/rewards';
import { getState, newId, updateState, type AppState } from './store';
import type { BattleTeamId, TeamBattle, TeamMessage } from '../types';

/**
 * Private team communication for Team Battle: text chat and the voice channel roster.
 *
 * Isolation rule: every read and write names the *viewer*, never a team. The team is
 * resolved here from the battle's member list, so there is no call that returns the
 * other team's channel. Messages live in one list per team (`battleId:teamId`), not a
 * shared list filtered in the UI. A backend replacing this keeps the same shape: the
 * server resolves the caller's team from their session and subscribes them to that
 * team's channel only.
 */

const EMPTY: TeamMessage[] = [];

export const SYSTEM_SENDER = 'system';

export const channelId = (battleId: string, team: BattleTeamId) => `${battleId}:${team}`;

export const battleById = (s: AppState, id: string): TeamBattle | undefined => s.battles?.find((b) => b.id === id);

/** The team this student plays for in this battle, or null if they aren't in it. */
export function teamOf(battle: TeamBattle, studentId: string): BattleTeamId | null {
  if (battle.teams.A.members.some((m) => m.studentId === studentId)) return 'A';
  if (battle.teams.B.members.some((m) => m.studentId === studentId)) return 'B';
  return null;
}

/**
 * The viewer's own team channel. Null when the viewer isn't on a team in this battle.
 * Returns a reference already in state, so it is safe as a useAppState selector.
 */
export function readTeamChannel(s: AppState, battleId: string, viewerId: string): TeamMessage[] | null {
  const battle = battleById(s, battleId);
  if (!battle) return null;
  const team = teamOf(battle, viewerId);
  if (!team) return null;
  return s.teamChannels?.[channelId(battleId, team)] ?? EMPTY;
}

export type PostOutcome = { ok: true; message: TeamMessage } | { ok: false; error: string };

/** Posts to the sender's own team. There is no way to address the other team. */
export function postTeamMessage(
  battleId: string,
  senderId: string,
  rawText: string,
  kind: TeamMessage['kind'] = 'text',
  now: number = Date.now(),
): PostOutcome {
  const battle = battleById(getState(), battleId);
  if (!battle) return { ok: false, error: 'This battle no longer exists.' };
  const team = teamOf(battle, senderId);
  if (!team) return { ok: false, error: "Only this team's members can post in its chat." };
  if (battle.status === 'finished' || battle.status === 'closed') {
    return { ok: false, error: 'The battle is over, so the chat is read-only.' };
  }
  const text = rawText.trim();
  if (!text) return { ok: false, error: 'Type a message first.' };
  if (text.length > BATTLE_CHAT_MAX_LENGTH) {
    return { ok: false, error: `Messages can be up to ${BATTLE_CHAT_MAX_LENGTH} characters.` };
  }
  return { ok: true, message: append(battleId, team, { id: newId('MSG'), senderId, text, kind, at: now }) };
}

/** Game events (lifelines, time-outs) shown in one team's chat. Called by battleService only. */
export function announceToTeam(battleId: string, team: BattleTeamId, text: string, now: number = Date.now()): void {
  append(battleId, team, { id: newId('MSG'), senderId: SYSTEM_SENDER, text, kind: 'system', at: now });
}

function append(battleId: string, team: BattleTeamId, message: TeamMessage): TeamMessage {
  const key = channelId(battleId, team);
  updateState((s) => ({
    ...s,
    teamChannels: { ...(s.teamChannels ?? {}), [key]: [...(s.teamChannels?.[key] ?? []), message] },
  }));
  return message;
}

/**
 * Who shares the viewer's voice channel: their own team, viewer first. Null for anyone
 * outside the battle. The opposing team never appears here.
 */
export function voiceRoster(battle: TeamBattle, viewerId: string): string[] | null {
  const team = teamOf(battle, viewerId);
  if (!team) return null;
  const ids = battle.teams[team].members.map((m) => m.studentId);
  return [viewerId, ...ids.filter((id) => id !== viewerId)];
}

/** Message count per member of the viewer's own team, for the results summary. */
export function messageCounts(s: AppState, battleId: string, viewerId: string): Record<string, number> | null {
  const channel = readTeamChannel(s, battleId, viewerId);
  if (!channel) return null;
  const counts: Record<string, number> = {};
  for (const m of channel) {
    if (m.senderId !== SYSTEM_SENDER) counts[m.senderId] = (counts[m.senderId] ?? 0) + 1;
  }
  return counts;
}
