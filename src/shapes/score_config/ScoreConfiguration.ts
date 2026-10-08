import { Thing } from '@_linked/schema/shapes/Thing';

import { QResult } from '@_linked/core/queries/SelectQuery';
import { irlcg } from '../../ontologies/lincd-irlcg.js';
import { linkedShape } from '../../package.js';
import type { ActionSubmissionResult } from '../ActionSubmission.js';
import { Action } from '../Action.js';

@linkedShape({
  description:
    'A configuration defining how scores are calculated for action. (scoring, algorithm, configuration)',
})
export class ScoreConfiguration extends Thing {
  static targetClass = irlcg.ScoreConfiguration;

  calculateTotalScore(
    action: QResult<Action>,
    userTopicActions: ActionSubmissionResult[],
    totalScore: number,
    medalTemplateIds?: {
      gold: string;
      silver: string;
      bronze: string;
    },
    medalScore?: {
      gold: number;
      silver: number;
      bronze: number;
    }
  ) {
    return 0;
  }
}
