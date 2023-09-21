export class UtilFns {
  /**
   * Returns random integer from given interval (min and max included)
   */
  public static randomIntFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Returns first and last day Date objects from given year/month
   */
  public static getFirstLastDay(year: number, month: number) {
    const firstDay = new Date();
    // -1 because months are 0 indexed
    // 1 to get fist day of that month
    firstDay.setUTCFullYear(year, month - 1, 1);

    const lastDay = new Date(firstDay);
    lastDay.setUTCMonth(firstDay.getMonth() + 1); // the next month
    lastDay.setUTCDate(0); // 0 will allways give you last day of the previous month

    return { firstDay, lastDay };
  }
}
