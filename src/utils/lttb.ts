/**
 * Largest Triangle Three Buckets
 * For explanation of the algorithm see: https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 * This is more readable, ES6 and typescript friendly version of the original JS implementation of LTTB.
 * (https://github.com/sveinn-steinarsson/flot-downsample)
 * @param data Array of arrays with x and y values such as: [[2, 3], [5, 7], [4, 6]]
 * @param threshold maximum length of the returned array (if input array is shorter, it will be simply returned without any decimation)
 */
export function lttb(data: [number, number][], threshold: number) {
  const data_length = data.length;
  if (threshold >= data_length || threshold === 0) {
    return data; // nothing to do
  }

  const downsampledData: typeof data = [];

  // size of each bucket - leave room for start and end data points
  const bucketSize = (data_length - 2) / (threshold - 2);

  // Point that was selected in the previous bucket.
  // Initially, it's the first point of data, because first bucket contains only 1 point
  let point_a = 0;

  let currentBucketIndex = 0;
  // first bucket always contains only the first point
  downsampledData[currentBucketIndex++] = data[point_a];

  for (let currentData_index = 0; currentData_index < threshold - 2; currentData_index++) {
    // Previous bucket:
    const point_a_x = data[point_a][0];
    const point_a_y = data[point_a][1];

    // Current bucket:
    const currentBucket_start = Math.floor((currentData_index + 0) * bucketSize) + 1;
    const currentBucket_end = Math.floor((currentData_index + 1) * bucketSize) + 1;

    const currentBucket = data.slice(currentBucket_start, currentBucket_end);

    // Next bucket:
    const nextBucket_start = Math.floor((currentData_index + 1) * bucketSize) + 1;
    let nextBucket_end = Math.floor((currentData_index + 2) * bucketSize) + 1;
    // nextBucket_end shouldn't exceed length of the data
    nextBucket_end = nextBucket_end < data_length ? nextBucket_end : data_length;

    const nextBucket = data.slice(nextBucket_start, nextBucket_end);

    // Calculate average x and y values from all points in the next bucket.
    // Point C is located at the average x and y values.
    const { point_c_x, point_c_y } = nextBucket.reduce(
      (averages, currentData) => {
        const currentValue_x = currentData[0];
        const currentValue_y = currentData[1];

        return {
          point_c_x: averages.point_c_x + currentValue_x / nextBucket.length,
          point_c_y: averages.point_c_y + currentValue_y / nextBucket.length,
        };
      },
      {
        point_c_x: 0,
        point_c_y: 0,
      }
    );

    // Point B is the point that will make the largest triangle when you connect points A, B and C.
    // Loop over all points in current bucket and return point that yields the largest triangle.
    // That point (B) will later become point A
    const { point_b_data, next_a } = currentBucket.reduce(
      (returnValues, currentData, currentBucket_data_index) => {
        const point_b_x = currentData[0];
        const point_b_y = currentData[1];

        // area of the current triangle (created by connecting points A, B and C)
        const area =
          Math.abs(
            (point_a_x - point_c_x) * (point_b_y - point_a_y) -
              (point_a_x - point_b_x) * (point_c_y - point_a_y)
          ) * 0.5;

        // save values only if area was bigger than previous maximum
        if (area > returnValues.max_area) {
          const point_b_index = currentData_index + currentBucket_data_index;
          return {
            point_b_data: currentData,
            next_a: point_b_index,
            max_area: area,
          };
        } else {
          return returnValues;
        }
      },
      {
        point_b_data: currentBucket[0],
        next_a: currentData_index,
        max_area: -1,
      }
    );

    // save point B from this bucket
    downsampledData[currentBucketIndex++] = point_b_data;

    // next point A will be current point B
    point_a = next_a;
  }

  // last bucket always contains only the last point
  downsampledData[currentBucketIndex++] = data[data_length - 1];

  return downsampledData;
}
