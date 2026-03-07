import type { PlayerColor } from "./game";

export type GameMode = "solo" | "teams";

export interface Team {
  name: string;
  color: PlayerColor;
  playerIds: string[];
}

export type TeamsRecord = Record<string, Team>;

const TEAM_NAMES: string[] = ["Team Red", "Team Blue", "Team Green"];
const TEAM_COLORS: PlayerColor[] = ["red", "blue", "green"];

/**
 * Max players allowed for a given mode and team count.
 * Solo: 2-3 players. Teams: teamCount * 2 players.
 */
export function getMaxPlayers(mode: GameMode, teamCount: number): number {
  return mode === "solo" ? 3 : teamCount * 2;
}

/**
 * Minimum players needed to start.
 * Solo: 2. Teams: teamCount * 2 (each team needs 2 players).
 */
export function getMinPlayers(mode: GameMode, teamCount: number): number {
  return mode === "solo" ? 2 : teamCount * 2;
}

/**
 * Create initial teams for a given team count (2 or 3).
 */
export function createTeams(teamCount: number): TeamsRecord {
  const teams: TeamsRecord = {};
  for (let i = 0; i < teamCount; i++) {
    const teamId = `team-${i}`;
    teams[teamId] = {
      name: TEAM_NAMES[i],
      color: TEAM_COLORS[i],
      playerIds: [],
    };
  }
  return teams;
}

/**
 * Assign a player to a team (round-robin).
 * Returns new teams record (immutable).
 */
export function assignPlayerToTeam(
  teams: TeamsRecord,
  playerId: string
): TeamsRecord {
  const teamIds = Object.keys(teams).sort();
  // Find team with fewest players
  let minCount = Infinity;
  let targetTeamId = teamIds[0];
  for (const teamId of teamIds) {
    const count = teams[teamId].playerIds.length;
    if (count < minCount) {
      minCount = count;
      targetTeamId = teamId;
    }
  }

  return {
    ...teams,
    [targetTeamId]: {
      ...teams[targetTeamId],
      playerIds: [...teams[targetTeamId].playerIds, playerId],
    },
  };
}

/**
 * Remove a player from their team.
 * Returns new teams record (immutable).
 */
export function removePlayerFromTeam(
  teams: TeamsRecord,
  playerId: string
): TeamsRecord {
  const updated: TeamsRecord = {};
  for (const [teamId, team] of Object.entries(teams)) {
    updated[teamId] = {
      ...team,
      playerIds: team.playerIds.filter((id) => id !== playerId),
    };
  }
  return updated;
}

/**
 * Get the team a player belongs to.
 */
export function getPlayerTeam(
  teams: TeamsRecord,
  playerId: string
): { teamId: string; team: Team } | null {
  for (const [teamId, team] of Object.entries(teams)) {
    if (team.playerIds.includes(playerId)) {
      return { teamId, team };
    }
  }
  return null;
}

/**
 * Get the color for a player based on their team.
 */
export function getPlayerTeamColor(
  teams: TeamsRecord,
  playerId: string
): PlayerColor | null {
  const result = getPlayerTeam(teams, playerId);
  return result ? result.team.color : null;
}

/**
 * Build turn order for team mode.
 * Alternates between teams: team1-p1, team2-p1, team3-p1, team1-p2, team2-p2, team3-p2
 */
export function buildTeamTurnOrder(teams: TeamsRecord): string[] {
  const teamIds = Object.keys(teams).sort();
  const maxPlayersPerTeam = Math.max(
    ...teamIds.map((id) => teams[id].playerIds.length)
  );

  const order: string[] = [];
  for (let round = 0; round < maxPlayersPerTeam; round++) {
    for (const teamId of teamIds) {
      const player = teams[teamId].playerIds[round];
      if (player) {
        order.push(player);
      }
    }
  }
  return order;
}

/**
 * Count sequences belonging to a team's color.
 */
export function countTeamSequences(
  sequences: { color: PlayerColor }[],
  teamColor: PlayerColor
): number {
  return sequences.filter((s) => s.color === teamColor).length;
}

/**
 * Get default sequences needed based on mode and player/team count.
 */
export function getDefaultSequencesNeeded(
  mode: GameMode,
  count: number
): number {
  if (mode === "solo") {
    return count >= 3 ? 1 : 2;
  }
  // Teams mode: default 2
  return 2;
}
