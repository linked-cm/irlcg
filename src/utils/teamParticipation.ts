import type { TeamParticipation } from '../shapes/Team.js';

type ParticipationScore = {
  creatorId?: string;
  actionId?: string;
  score?: number;
};

type ParticipationAction = TeamParticipation['action'];

/**
 * Calculates reporting percentages from positive, unique member participation.
 * Event actions remain visible at 0%, while scored legacy actions are retained.
 */
export function calculateTeamParticipation(
  memberIds: Iterable<string>,
  scores: ParticipationScore[],
  actions: ParticipationAction[]
): Record<string, TeamParticipation> {
  const members = new Set(memberIds);
  if (members.size === 0) return {};

  const participantsByAction = new Map<string, Set<string>>();

  scores.forEach(({ creatorId, actionId, score }) => {
    if (
      !creatorId ||
      !actionId ||
      !members.has(creatorId) ||
      (score ?? 0) <= 0
    ) {
      return;
    }

    const participants = participantsByAction.get(actionId) || new Set();
    participants.add(creatorId);
    participantsByAction.set(actionId, participants);
  });

  const actionsById = new Map(actions.map((action) => [action.id, action]));
  participantsByAction.forEach((_, actionId) => {
    if (!actionsById.has(actionId)) {
      actionsById.set(actionId, { id: actionId });
    }
  });

  return Object.fromEntries(
    Array.from(actionsById, ([actionId, action]) => [
      actionId,
      {
        action,
        percentage: Math.round(
          ((participantsByAction.get(actionId)?.size || 0) / members.size) * 100
        ),
      },
    ])
  );
}
