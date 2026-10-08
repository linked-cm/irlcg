export const BRONZE_MEDAL_NUMBER: number = 1;
export const SILVER_MEDAL_NUMBER: number = 2;
export const GOLD_MEDAL_NUMBER: number = 3;

export function getMedalNumber(type: 'gold' | 'silver' | 'bronze' | 'none') {
  switch (type) {
    case 'bronze':
      return BRONZE_MEDAL_NUMBER;
    case 'silver':
      return SILVER_MEDAL_NUMBER;
    case 'gold':
      return GOLD_MEDAL_NUMBER;
    default:
      return 0;
  }
}
export function getMedalType(number: number) {
  switch (number) {
    case BRONZE_MEDAL_NUMBER:
      return 'bronze';
    case SILVER_MEDAL_NUMBER:
      return 'silver';
    case GOLD_MEDAL_NUMBER:
      return 'gold';
    default:
      return 'none';
  }
}
