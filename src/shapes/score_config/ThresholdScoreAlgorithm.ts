import { xsd } from '@_linked/xsd/ontologies/xsd';

import { QResult } from '@_linked/core/queries/SelectQuery';
import { literalProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../../ontologies/lincd-irlcg.js';
import { linkedShape } from '../../package.js';
import { ScoreConfiguration } from './ScoreConfiguration.js';
import { Action } from '../Action.js';
import type { ActionSubmissionResult } from '../ActionSubmission.js';

@linkedShape({
  description:
    'A scoring algorithm that awards medals based on point thresholds. Represents threshold-based scoring with bronze, silver, and gold minimum score requirements. (threshold scoring, point-based, level)',
})
export class ThresholdScoreAlgorithm extends ScoreConfiguration {
  static targetClass = irlcg.ThresholdScoreAlgorithm;

  @literalProperty({
    path: irlcg.bronzeMinScore,
    datatype: xsd.integer,
    maxCount: 1,
  })
  get bronzeMinScore(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.silverMinScore,
    datatype: xsd.integer,
    maxCount: 1,
  })
  get silverMinScore(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.goldMinScore,
    datatype: xsd.integer,
    maxCount: 1,
  })
  get goldMinScore(): number {
    return 0;
  }

  static calculateTotalScore(
    action: QResult<Action>,
    userActionSubmissions: ActionSubmissionResult[],
    totalScore: number,
    medalScore?: {
      gold: number;
      silver: number;
      bronze: number;
    }
  ) {
    if (!medalScore) return 0;
    //use action.
    if (totalScore >= medalScore.gold) {
      return 3;
    }
    if (totalScore >= medalScore.silver) {
      return 2;
    }
    if (totalScore >= medalScore.bronze) {
      return 1;
    }
    return 0;
  }
}
