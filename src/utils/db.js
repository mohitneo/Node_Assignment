const mongoose = require('mongoose');
const options = require('../config');

const connectDb = (url = options.dbUrl, opts = {}) => {
  return mongoose.connect(url, {
    ...opts,
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
};

const getPaginationAggregateQuery = (
  pageNumber,
  pageSize,
  sortBy,
  sort,
  match
) => {
  const aggregateQuery = [];
  if (match)
    aggregateQuery.push({
      $match: match
    });
  aggregateQuery.push(
    ...[
      // Projection
      {
        $project: {
          _id: 0
        }
      },
      // Sorting
      {
        $sort: {
          [sortBy]: sort === 'asc' ? 1 : -1
        }
      },
      // Pagination
      {
        $facet: {
          totalCount: [{ $count: 'value' }],
          paginatedResults: [
            {
              $skip: (pageNumber - 1) * pageSize
            },
            {
              $limit: pageSize
            }
          ]
        }
      },
      // Projection for getting the required output
      {
        $project: {
          totalCount: { $arrayElemAt: ['$totalCount.value', 0] },
          isNextPage: {
            $cond: {
              if: {
                $gt: [
                  { $arrayElemAt: ['$totalCount.value', 0] },
                  pageSize * pageNumber
                ]
              },
              then: true,
              else: false
            }
          },
          data: '$paginatedResults'
        }
      }
    ]
  );
  return aggregateQuery;
};

module.exports = { connectDb, getPaginationAggregateQuery };
