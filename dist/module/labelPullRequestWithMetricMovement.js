'use strict';

var GitHubApi = require('github');

/*
{
  githubToken: '...github access token...',
  ownerAndRepo: 'holidayextras/tripapplite',
  prNumber: 1234,
  metrics: {
    previous: 2044,
    current: 2120
  },

  // Is a "good" result that the metric goes up (for example, code coverage)
  // or down (for example, page weight or benchmark run time)?
  desirableTrajectory: ('INCREASE'|'DECREASE')

  // Labels of 5 states (major/minor improvement/detraction and no change)
  // can be applied based on the metric moving by a raw value or a percentage.
  minorPercentageThreshold: 2,
  minorValueThreshold: 5,
  majorPercentageThreshold: 5,
  majorValueThreshold: 10,

  // The labels and colours can be overriden completely...
  labels: [
    'Major detraction',
    'Minor detraction',
    'No significant impact',
    'Minor improvement',
    'Major improvement'
  ],

  // ...or clarified with the name of the metric (which will be appended
  // before the last word in the default label)
  labelModifier: 'parse time',

  labelColours: [
    'b70000',
    'b78000',
    'b5b7b5',
    'b7b100',
    '00b700'
  ]
}
*/

module.exports = function (options) {
  var owner = options.ownerAndRepo.split('/')[0];
  var repo = options.ownerAndRepo.split('/')[1];
  var number = options.prNumber;
  var previousMetric = options.metrics.previous;
  var currentMetric = options.metrics.current;

  options.labels = options.labels || ['Major detraction', 'Minor detraction', 'No significant impact', 'Minor improvement', 'Major improvement'];

  options.labelColours = options.labelColours || ['b70000', 'b78000', 'b5b7b5', 'b7b100', '00b700'];

  if (options.labelModifier) {
    options.labels = options.labels.map(function (label) {
      return label.replace(/ (\w+)$/, ' ' + options.labelModifier + ' $1');
    });
  }

  var valueDiff = currentMetric - previousMetric;
  var percentDiff = (currentMetric / previousMetric * 100 - 100).toFixed(2);

  // The labels are in the human-readable "worst to best" order, but `thresholdMapping`
  // is ordered "most to least dramatic"; if multiple items match (for example, if
  // the metric increased 20%, it's above both a minor 5% and a major 15%) we want the
  // most relevant one (15%) to be first in the array so it's easy to decide which to
  // use
  var thresholdMappingToLabelMapping = [0, 4, 1, 3, 2];
  var thresholdMapping = [[-options.majorValueThreshold, -options.majorPercentageThreshold], [options.majorValueThreshold, options.majorPercentageThreshold], [-options.minorValueThreshold, -options.minorPercentageThreshold], [options.minorValueThreshold, options.minorPercentageThreshold], [0, 0]];

  if (options.desirableTrajectory === 'DECREASE') {
    thresholdMapping = thresholdMapping.map(function (values) {
      return [-values[0], -values[1]];
    });
  }

  var thresholdMappingMatches = thresholdMapping.map(function (mapping) {
    var valueMatchesThreshold = mapping[0] === 0 || valueDiff > 0 && mapping[0] > 0 && valueDiff >= mapping[0] || valueDiff < 0 && mapping[0] < 0 && valueDiff <= mapping[0];
    var percentMatchesThreshold = mapping[1] === 0 || percentDiff > 0 && mapping[1] > 0 && percentDiff >= mapping[0] || percentDiff < 0 && mapping[1] < 0 && percentDiff <= mapping[0];

    return valueMatchesThreshold || percentMatchesThreshold;
  });

  var labelIndex = void 0;
  thresholdMappingMatches.some(function (matches, index) {
    labelIndex = thresholdMappingToLabelMapping[index];
    return matches;
  });
  var name = options.labels[labelIndex];
  var color = options.labelColours[labelIndex];

  var github = new GitHubApi();

  github.authenticate({
    type: 'token',
    token: options.githubToken
  });

  return github.issues.getIssueLabels({ owner: owner, repo: repo, number: number }).then(function (labelsAlreadyOnIssue) {
    var labelIsAlreadyApplied = Boolean(labelsAlreadyOnIssue.data.filter(function (label) {
      return label.name === name;
    }).length);

    var removeLabelsPromises = Promise.all(labelsAlreadyOnIssue.data.filter(function (label) {
      return label.name !== name && options.labels.indexOf(label.name) !== -1;
    }).map(function (label) {
      var name = label.name;
      return github.issues.removeLabel({ owner: owner, repo: repo, number: number, name: name });
    }));

    if (labelIsAlreadyApplied) {
      return removeLabelsPromises;
    }

    return removeLabelsPromises.then(function () {
      var per_page = 100; // eslint-disable-line camelcase
      return github.issues.getLabels({ owner: owner, repo: repo, per_page: per_page });
    }).then(function (availableLabelsForRepo) {
      return availableLabelsForRepo.data.filter(function (label) {
        return label.name === name;
      })[0];
    }).then(function (maybeExistingLabel) {
      if (maybeExistingLabel) return Promise.resolve({ data: maybeExistingLabel });
      return github.issues.createLabel({ owner: owner, repo: repo, name: name, color: color });
    }).then(function (response) {
      var labels = [response.data];
      return github.issues.addLabels({ owner: owner, repo: repo, number: number, labels: labels });
    });
  });
};